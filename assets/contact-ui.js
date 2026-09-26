(() => {
  document.querySelectorAll('.contact-whatsapp[data-native]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      let timer;
      const stop = () => {clearTimeout(timer);window.removeEventListener('blur', stop);document.removeEventListener('visibilitychange', hide);};
      const hide = () => {if (document.hidden) stop();};
      window.addEventListener('blur', stop, {once:true});document.addEventListener('visibilitychange', hide);
      timer = setTimeout(() => {stop();if (!document.hidden) location.assign(link.href);}, 1100);
      location.assign(link.dataset.native);
    });
  });
  const form = document.querySelector('#campaign-enquiry');
  if (!form) return;
  const status = document.querySelector('#enquiry-status');
  const button = form.querySelector('button[type="submit"]');
  const buttonLabel = button.textContent;
  const phone = form.elements.phone;
  const website = form.elements.website;
  const interest = form.elements.campaign_interest;
  const event = name => window.coinCampaignEvent?.(name);
  const requestId = [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2,'0')).join('');
  const errorMessage = 'We could not confirm that your details were received. Your entries are still here. Please try again or use one of the contact options below.';
  function normalizeWebsite() {
    if (!website) return true;
    let value = website.value.trim();
    if (value && !/^[a-z][a-z0-9+.-]*:/i.test(value)) value = 'https://' + value;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
      website.value = value;
      website.setCustomValidity('');
      return true;
    } catch (_) {
      website.setCustomValidity('Enter a valid HTTP or HTTPS website.');
      return false;
    }
  }
  function updatePhone() {
    const channel = form.elements.channel.value || 'Email';
    phone.required = channel !== 'Email';
    phone.setCustomValidity('');
  }
  form.querySelectorAll('[name="channel"]').forEach(input => input.addEventListener('change', updatePhone));
  phone.addEventListener('input', () => phone.setCustomValidity(''));
  website?.addEventListener('input', () => website.setCustomValidity(''));
  website?.addEventListener('blur', normalizeWebsite);
  updatePhone();
  form.addEventListener('invalid', validationEvent => {
    const details = validationEvent.target.closest('details');
    if (details) details.open = true;
  }, true);
  let busy = false;
  form.addEventListener('submit', async submitEvent => {
    submitEvent.preventDefault(); if (busy) return;
    updatePhone();
    if (!normalizeWebsite()) { website.reportValidity(); return; }
    const digits = phone.value.replace(/\D/g,'');
    if ((phone.required || phone.value.trim()) && (!/^[+\d() .-]+$/.test(phone.value) || digits.length < 7 || digits.length > 15)) {
      phone.setCustomValidity('Add a phone number for your selected contact method.');phone.reportValidity();return;
    }
    if (!form.reportValidity()) return;
    busy=true;button.disabled=true;button.textContent='Sending…';form.setAttribute('aria-busy','true');status.textContent='';status.classList.remove('is-error');
    const payload=Object.fromEntries(new FormData(form));payload.request_id=requestId;
    payload.channel ||= 'Email';
    const source = document.body.dataset.campaignSource;
    if (source === '/ms' || source === '/investors') payload.source = source;
    if ('investor_slugs' in payload) payload.investor_slugs = payload.investor_slugs ? String(payload.investor_slugs).split(',') : [];
    if (interest) payload.campaign_interest = interest.value;
    const controller = new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
    try {
      const response=await fetch('/api/open/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      const result=await response.json();
      if (!response.ok || result.received!==true) throw new Error(response.status===422 && source==='/investors' && typeof result.error==='string' ? 'validation:'+result.error : 'Unconfirmed');
      form.hidden=true;const success=document.querySelector('#enquiry-success');success.hidden=false;success.focus();
      event('lead_submitted');
    } catch (error) {
      status.classList.add('is-error');status.textContent=String(error.message).startsWith('validation:') ? error.message.slice(11)+' Your entries are still here.' : errorMessage;
      event('lead_submit_failed');
    } finally {clearTimeout(timer);busy=false;button.disabled=false;button.textContent=buttonLabel;form.removeAttribute('aria-busy');}
  });
})();
