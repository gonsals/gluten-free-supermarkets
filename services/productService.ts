import { db } from "@/config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface ProductData {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  glutenFree: boolean;
}

export const fetchProductFromAPI = async (barcode: string) => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const product = data.product;

      const productData: ProductData = {
        id: barcode,
        name: product.product_name,
        brand: product.brands,
        imageUrl: product.image_url,
        glutenFree: product.labels_tags.includes("en:gluten-free"),
      };

      await saveProductToFirestore(productData);
    } else {
      console.log("Producto no encontrado o no tiene suficiente información.");
    }
  } catch (error) {
    console.error("Error al obtener el producto:", error);
  }
};

const saveProductToFirestore = async (productData: ProductData) => {
  try {
    const productRef = doc(db, "products", productData.id);
    const productSnapshot = await getDoc(productRef);

    if (!productSnapshot.exists()) {
      await setDoc(productRef, productData);
      console.log("Producto guardado en Firebase.");
    } else {
      console.log("El producto ya existe en la base de datos.");
    }
  } catch (error) {
    console.error("Error al guardar el producto en Firestore:", error);
  }
};
