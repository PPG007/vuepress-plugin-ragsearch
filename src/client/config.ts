import { defineClientConfig } from "vuepress/client";
import RAGSearch from "./components/RAGSearch.vue";

export { getRAGSearchThemeColor, setRAGSearchThemeColor } from "./theme";

export default defineClientConfig({
  rootComponents: [RAGSearch],
});
