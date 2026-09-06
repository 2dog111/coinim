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
  const phone = form.elements.phone;
  const requestId = [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2,'0')).join('');
  phone.addEventListener('input', () => phone.setCustomValidity(''));
  let busy = false;
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const digits = phone.value.replace(/\D/g,'');
    if (!/^[+\d() .-]+$/.test(phone.value) || digits.length < 7 || digits.length > 15) {
      phone.setCustomValidity('Enter your phone number with its country code.');phone.reportValidity();return;
    }
    if (!form.reportValidity()) return;
    busy=true;button.disabled=true;button.textContent='Sending your enquiry…';form.setAttribute('aria-busy','true');status.textContent='';status.classList.remove('is-error');
    const payload=Object.fromEntries(new FormData(form));payload.request_id=requestId;
    const controller = new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
    try {
      const response=await fetch('/api/open/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      const result=await response.json();
      if (!response.ok || result.received!==true) throw new Error(result.error || 'Your enquiry could not be sent. Please try again.');
      document.querySelector('#success-channel').textContent=`We’ll contact you by ${payload.channel === 'Phone' ? 'phone' : payload.channel === 'Email' ? 'email' : payload.channel}.`;
      form.hidden=true;const success=document.querySelector('#enquiry-success');success.hidden=false;success.focus();
    } catch (error) {
      status.classList.add('is-error');status.textContent=error.name==='AbortError'?'The connection took too long. Your details are still here. Please try again.':error.message==='Failed to fetch'?'Connection lost. Your details are still here. Please try again.':error.message;
    } finally {clearTimeout(timer);busy=false;button.disabled=false;button.textContent='Request a conversation';form.removeAttribute('aria-busy');}
  });
})();
