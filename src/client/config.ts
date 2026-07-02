import { defineClientConfig } from "vuepress/client";
import RAGSearch from "./components/RAGSearch.vue";

export default defineClientConfig({
  rootComponents: [RAGSearch],
});
