import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import ReactPage from "./pages/ReactPage";
import VuePage from "./pages/VuePage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Link to="react">React 应用</Link> | <Link to="vue">Vue 应用</Link>
        <Routes>
          <Route path="/react" element={<ReactPage />} />
          <Route path="/vue" element={<VuePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
