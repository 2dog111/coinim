// Optional Investor Match handoff. The existing inquiry form/handler stays canonical.
(() => {
  'use strict';
  function receive(){
    const prefix='#investor-brief=';
    if(!location.hash.startsWith(prefix))return;
    const audience=document.querySelector('#lead-audience'),form=document.querySelector('#campaign-enquiry');
    if(!audience||!form)return;
    let value;try{value=decodeURIComponent(location.hash.slice(prefix.length));}catch(_){return;}
    if(!value.startsWith('Investor Match inquiry.')||value.length>2000)return;
    let notice=document.querySelector('#investor-handoff-notice');
    if(!notice){notice=document.createElement('p');notice.id='investor-handoff-notice';notice.setAttribute('role','status');form.before(notice);}
    if(!audience.value.trim()){
      audience.value=value;audience.dispatchEvent(new Event('input',{bubbles:true}));
      const interest=form.elements.campaign_interest;if(interest)interest.value='help';
      notice.textContent='Your Investor Match shortlist is in the inquiry field. Review it before submitting. Investor outreach scope and pricing are agreed separately. Nothing has been sent yet.';
    }else{
      notice.textContent='Your existing inquiry is preserved. Copy the investor brief below if you want to add it. Nothing has been sent yet.';
      const field=document.createElement('textarea');field.readOnly=true;field.rows=6;field.value=value;field.setAttribute('aria-label','Investor Match research brief');notice.after(field);
    }
    history.replaceState(null,'',location.pathname+location.search+'#start');
    document.querySelector('#start').scrollIntoView();
  }
  receive();window.addEventListener('hashchange',receive);
})();
