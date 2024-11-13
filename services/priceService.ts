import { db } from "@/config/firebaseConfig";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";

const addOrUpdatePrice = async (
  barcode: string,
  supermarketId: string,
  price: number,
  supermarketName: string
) => {
  try {
    const productRef = doc(db, "products", barcode);

    const productSnapshot = await getDoc(productRef);

    if (productSnapshot.exists()) {
      const priceRef = doc(collection(productRef, "prices"), supermarketId);

      await setDoc(priceRef, {
        price: price,
        date: new Date().toISOString(),
        supermarketName: supermarketName,
      });

      console.log("Precio actualizado en la subcolección.");
    } else {
      console.log("Producto no encontrado en Firebase.");
    }
  } catch (error) {
    console.error("Error al agregar o actualizar el precio:", error);
  }
};

export default addOrUpdatePrice;
