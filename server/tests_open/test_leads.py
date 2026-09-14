import asyncio
import json
import secrets
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from coin_open import app as intake, admin


class LeadsTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();root=Path(self.tmp.name)
        self.patches=[patch.object(intake,'DATA_ROOT',root/'data'),patch.object(intake,'KEY_PATH',root/'key'),patch.object(intake,'ADMIN_TOKEN_PATH',root/'token')]
        for p in self.patches:p.start()
        intake.KEY_PATH.write_bytes(secrets.token_bytes(32));intake.ADMIN_TOKEN_PATH.write_text('owner-local-test-key-1234567890')
        self.payload=dict(website='https://example.com',campaign_interest='help',name='<script>Alex</script>',company='Sample & Company',phone='+1 212 555 0123',work_email='alex@example.com',office_address='12 Example Street, Suite 5',channel='SMS',request_id=secrets.token_hex(16))
    def tearDown(self):
        for p in reversed(self.patches):p.stop()
        self.tmp.cleanup()
    def request(self,path,method='GET',data=None,origin='https://coin.im',headers=None):
        async def run():
            sent=False;out=[]
            async def receive():
                nonlocal sent
                if sent:return {'type':'http.disconnect'}
                sent=True;return {'type':'http.request','body':json.dumps(data or {}).encode(),'more_body':False}
            async def send(event):out.append(event)
            await intake.app({'type':'http','method':method,'path':path,'headers':[(b'origin',origin.encode())]+(headers or []),'client':('127.0.0.1',9999)},receive,send)
            start=next(e for e in out if e['type']=='http.response.start');body=b''.join(e.get('body',b'') for e in out if e['type']=='http.response.body')
            return start['status'],body,dict(start['headers'])
        return asyncio.run(run())
    def test_saved_and_visible_in_admin_without_duplicate(self):
        first=self.request('/api/open/leads','POST',self.payload);self.assertEqual(first[0],201)
        again=self.request('/api/open/leads','POST',self.payload);self.assertEqual(first[1],again[1])
        jobs=admin.list_jobs(intake.DATA_ROOT,intake.load_key(),intake.read_json_encrypted);self.assertEqual(len(jobs),1)
        self.assertEqual(jobs[0]['company'],self.payload['company']);self.assertEqual(jobs[0]['office_address'],self.payload['office_address']);self.assertEqual(jobs[0]['channels'],['SMS'])
        status,html,headers=self.request('/api/open/panel/owner-local-test-key-1234567890');self.assertEqual(status,200);self.assertIn(b'Sample &amp; Company',html);self.assertIn(b'&lt;script&gt;',html);self.assertNotIn(b'<script>Alex',html);self.assertEqual(headers[b'referrer-policy'],b'no-referrer')
        encrypted=next((intake.DATA_ROOT/'jobs').glob('*/metadata.json.aesgcm')).read_bytes();self.assertNotIn(b'alex@example.com',encrypted)
    def test_minimal_inquiry_normalizes_domain_and_saves_interest(self):
        data={"website":"example.com", "name":"Local QA", "work_email":"qa@example.com", "campaign_interest":"pilot", "audience":"Operations teams", "request_id":secrets.token_hex(16)}
        first=self.request('/api/open/leads','POST',data)
        self.assertEqual(first[0],201)
        self.assertEqual(self.request('/api/open/leads','POST',data)[1],first[1])
        job=admin.list_jobs(intake.DATA_ROOT,intake.load_key(),intake.read_json_encrypted)[0]
        self.assertEqual(job['website'],'https://example.com')
        self.assertEqual(job['campaign_interest'],'pilot')
        self.assertEqual(job['audience'],'Operations teams')
        self.assertEqual(job['channels'],['Email'])
        data['campaign_interest']='scale'
        self.assertEqual(self.request('/api/open/leads','POST',data)[0],409)
    def test_phone_required_only_for_phone_channels_and_interest_validated(self):
        data={**self.payload,'phone':'','company':'','channel':'Email'}
        self.assertEqual(self.request('/api/open/leads','POST',data)[0],201)
        for channel in ['WhatsApp','SMS','Phone']:
            self.assertEqual(self.request('/api/open/leads','POST',{**data,'channel':channel})[0],422)
        for interest in ['unknown',[],{}]:
            self.assertEqual(self.request('/api/open/leads','POST',{**data,'campaign_interest':interest})[0],422)
        self.assertEqual(self.request('/api/open/leads','POST',{**data,'audience':'x'*2001})[0],422)
    def test_conflicting_retry(self):
        self.assertEqual(self.request('/api/open/leads','POST',self.payload)[0],201)
        self.payload['company']='Changed';self.assertEqual(self.request('/api/open/leads','POST',self.payload)[0],409)
    def test_website_is_encrypted_visible_and_part_of_retry_identity(self):
        self.payload['website']='https://example.com/business'
        with patch.object(intake, 'resolve_public_host'):
            first=self.request('/api/open/leads','POST',self.payload)
            self.assertEqual(first[0],201)
            self.assertEqual(self.request('/api/open/leads','POST',self.payload)[1],first[1])
            jobs=admin.list_jobs(intake.DATA_ROOT,intake.load_key(),intake.read_json_encrypted)
            self.assertEqual(jobs[0]['website'],self.payload['website'])
            encrypted=next((intake.DATA_ROOT/'jobs').glob('*/metadata.json.aesgcm')).read_bytes()
            self.assertNotIn(self.payload['website'].encode(),encrypted)
            self.payload['website']='https://example.com/changed'
            self.assertEqual(self.request('/api/open/leads','POST',self.payload)[0],409)
    def test_website_uses_existing_public_url_validation(self):
        for website in ['javascript:alert(1)', 'http://127.0.0.1', 'https://user:password@example.com', ['https://example.com'], 'https://'+'a'*2048]:
            with self.subTest(website=website):
                self.assertEqual(self.request('/api/open/leads','POST',{**self.payload,'website':website})[0],422)
        self.assertFalse((intake.DATA_ROOT/'jobs').exists())
    def test_validation_and_origin(self):
        for field,value in [('website',''),('phone','123'),('work_email','bad'),('channel','Telegram'),('fax','bot'),('request_id','bad')]:
            data={**self.payload,field:value};self.assertEqual(self.request('/api/open/leads','POST',data)[0],422,field)
        self.assertEqual(self.request('/api/open/leads','POST',self.payload,origin='https://other.example')[0],403)
        self.assertFalse((intake.DATA_ROOT/'jobs').exists())
    def test_failure_does_not_claim_success(self):
        with patch.object(intake,'write_json_encrypted',side_effect=OSError('local simulated failure')):
            self.assertEqual(self.request('/api/open/leads','POST',self.payload)[0],500)
        self.assertEqual(self.request('/api/open/leads','POST',self.payload)[0],201)
    def test_admin_login_and_legacy_draft(self):
        self.assertEqual(self.request('/api/open/panel/wrong-key-123456789012345')[0],404)
        status,body,headers=self.request('/api/open/admin','POST',{'key':'owner-local-test-key-1234567890'});self.assertEqual(status,200)
        cookie=headers[b'set-cookie'];self.assertIn(b'HttpOnly',cookie);self.assertIn(b'Secure',cookie)
        self.assertEqual(self.request('/api/open/admin',headers=[(b'cookie',cookie.split(b';')[0])])[0],200)
        draft=json.loads(self.request('/api/open/drafts','POST')[1])['draft_id']
        data={**self.payload,'channels':['SMS']};self.assertEqual(self.request('/api/open/drafts/'+draft+'/submit','POST',data)[0],201)
if __name__=='__main__':unittest.main()
