import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import ReactPage from "./pages/ReactPage";
import StaticPage from "./pages/StaticPage";
import VuePage from "./pages/VuePage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Link to="react">React 应用</Link> | <Link to="vue">Vue 应用</Link> |{" "}
        <Link to="static">静态应用</Link>
        <Routes>
          <Route path="/react" element={<ReactPage />} />
          <Route path="/vue" element={<VuePage />} />
          <Route path="/static" element={<StaticPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
