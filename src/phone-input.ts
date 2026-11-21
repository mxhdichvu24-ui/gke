export function enhancePhoneInputs(){
 for(const input of document.querySelectorAll<HTMLInputElement>('input[type="tel"]')){
  const clean=()=>{const digits=input.value.replace(/[^0-9]/g,'').slice(0,13);if(input.value!==digits)input.value=digits;};
  input.addEventListener('input',clean);clean();
 }
}
