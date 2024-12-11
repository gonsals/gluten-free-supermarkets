import { useState, useEffect } from "react";

const useFetchProduct = (barcode: string) => {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!barcode) return;

            console.log(barcode);

            try {
                setLoading(true);
                const response = await fetch(
                    `https://world.openfoodfacts.net/api/v2/product/${barcode}`
                );
                const data = await response.json();

                console.log(data);

                if (data.status === 1 && data.product) {
                    setProduct(data.product);
                    setError(null);
                } else if (data.status === 0) {
                    setError(
                        "Producto no encontrado. Puedes intentar con otro código de barras."
                    );
                    setProduct(null);
                } else {
                    setError(
                        "No se tiene suficiente información sobre el producto."
                    );
                    setProduct(null);
                }
            } catch (err) {
                setError("Error al obtener el producto.");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [barcode]);

    return { product, loading, error, setProduct };
};

export default useFetchProduct;
