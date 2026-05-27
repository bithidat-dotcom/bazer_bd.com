import { db } from './src/lib/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

async function fix() {
  const qs = await getDocs(collection(db, 'reviews'));
  console.log(`Found ${qs.docs.length} reviews.`);
  
  for (const d of qs.docs) {
    const data = d.data();
    console.log("Found review", d.id, data);
    
    // We will update it to have all potential name/comment fields to prevent charAt errors
    // or just delete it if it's completely malformed.
    const nameStr = data.userName || data.user_name || data.customerName || data.name || data.author || "Anonymous";
    const commentStr = data.comment || data.text || data.message || data.review || "";
    
    await updateDoc(doc(db, 'reviews', d.id), {
       userName: nameStr,
       user_name: nameStr,
       name: nameStr,
       customerName: nameStr,
       author: nameStr,
       comment: commentStr,
       text: commentStr,
       message: commentStr,
       review: commentStr,
       // what about product ID?
       productId: data.product_id || data.productId || "1"
    });
    console.log(`Updated doc ${d.id}`);
  }
  
  console.log("Done");
  process.exit(0);
}

fix().catch(console.error);
