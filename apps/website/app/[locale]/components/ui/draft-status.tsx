'use client'
export function DraftStatus({state,locale}:{state:'idle'|'saving'|'saved'|'error';locale:'ar'|'en'}) {
 if(state==='idle')return null
 const ar=locale==='ar'
 return <p role="status" className="booking-draft-status">{state==='saving'?(ar?'جارٍ حفظ بياناتك المبدئية…':'Saving your contact details…'):state==='saved'?(ar?'تم حفظ بياناتك مبدئيًا. أكمل لتأكيد طلب الموعد.':'Contact details saved. Complete your appointment request.'): (ar?'تعذر الحفظ المبدئي. يمكنك إكمال الطلب وإرساله.':'Could not save yet. You can still complete and send your request.')}</p>
}
