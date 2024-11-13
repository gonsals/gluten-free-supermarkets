import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import useFetchProduct from "@/hooks/useFetchProduct";

export default function TabTwoScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [barcodeData, setBarcodeData] = useState<string | null>(null);
  const { product, loading, error, setProduct } = useFetchProduct(
    barcodeData || ""
  );

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  const handleBarcodeScanned = (scanningResult: { data: string }) => {
    setScanned(true);
    const { data } = scanningResult;
    setBarcodeData(data);
    alert(`Scanned code data: ${data}`);
  };

  const closeProduct = () => {
    setProduct(null);
    setScanned(false);
    setBarcodeData(null);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "upc_a"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.square} />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip Camera</Text>
          </TouchableOpacity>
        </View>
      </CameraView>

      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF6347" />
        </View>
      )}
      {error && !product && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.dataText}>Error: {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setBarcodeData(null);
              setScanned(false);
            }}
          >
            <Text style={styles.retryButtonText}>Buscar otro producto</Text>
          </TouchableOpacity>
        </View>
      )}
      {product && (
        <View style={styles.productInfo}>
          <Text style={styles.productName}>
            {product.product_name || "Nombre no disponible"}
          </Text>
          <Text style={styles.productBrand}>
            {product.brands || "Marca no disponible"}
          </Text>
          {product.image_url && (
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
            />
          )}
          <View style={styles.productDetails}>
            <Text style={styles.dataText}>Detalles del producto:</Text>
            <Text style={styles.dataText}>
              ¿Sin gluten?{" "}
              {product.labels_tags?.includes("en:no-gluten") ? "Sí" : "No"}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={closeProduct}>
            <Text style={styles.text}>Cerrar Producto</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    fontSize: 20,
    color: "#333",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  square: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: "red",
    backgroundColor: "transparent",
    borderRadius: 10,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  loaderContainer: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    alignItems: "center",
  },
  errorContainer: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    alignItems: "center",
  },
  dataText: {
    fontSize: 18,
    textAlign: "center",
    color: "#333",
    marginVertical: 5,
  },
  productInfo: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: "center",
  },
  productName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  productBrand: {
    fontSize: 16,
    color: "#666",
  },
  productImage: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginTop: 10,
  },
  productDetails: {
    marginTop: 10,
    alignItems: "center",
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: "#FF6347",
    padding: 10,
    borderRadius: 5,
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: "#FFA500",
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    fontSize: 18,
    color: "white",
  },
});
