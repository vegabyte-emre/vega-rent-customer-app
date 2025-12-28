export default {
  expo: {
    name: process.env.COMPANY_NAME || "Vega Rent",
    slug: "vega-rent-customer",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "vegarent",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#1E3A8A"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.BUNDLE_ID || "com.vegarent.customer"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#1E3A8A"
      },
      package: process.env.PACKAGE_NAME || "com.vegarent.customer"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#1E3A8A"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      API_URL: process.env.API_URL || "http://localhost:8001",
      COMPANY_NAME: process.env.COMPANY_NAME || "Rent A Car",
      COMPANY_CODE: process.env.COMPANY_CODE || "default",
      eas: {
        projectId: "11d08a0d-b759-4489-9e3f-fca7161a7029"
      }
    },
    owner: "emrenasir"
  }
};
