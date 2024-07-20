import { useEffect } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { preloadApp } from "wujie";
import AsyncPage from "./pages/AsyncPage";
import BeforePage from "./pages/BeforePage";
import ReactPage from "./pages/ReactPage";
import StaticPage from "./pages/StaticPage";
import VuePage from "./pages/VuePage";

function App() {
  useEffect(() => {
    preloadApp({
      name: "react-project",
      url: "http://localhost:10000",
    });
  }, []);
  return (
    <div className="App">
      <BrowserRouter>
        <Link to="/">首页</Link> | <Link to="react">React 应用</Link> |{" "}
        <Link to="vue">Vue 应用</Link> | <Link to="static">静态应用</Link> |{" "}
        <Link to="async">Async 应用</Link> |{" "}
        <Link to="before-plugins">打断应用</Link>
        <Routes>
          <Route path="/react" element={<ReactPage />} />
          <Route path="/vue" element={<VuePage />} />
          <Route path="/static" element={<StaticPage />} />
          <Route path="/async" element={<AsyncPage />} />
          <Route path="/before-plugins" element={<BeforePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
