import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import TagSelect from "./pages/TagSelect";
import Fridge from "./pages/Fridge";
import Shopping from "./pages/Shopping";
import AIChat from "./pages/AIChat";
import Calendar from "./pages/Calendar";


// Global animation styles
const globalStyle = document.createElement("style");
globalStyle.innerHTML = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; background: #0f2027; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-6px); opacity: 1; }
  }
  input::placeholder { color: rgba(255,255,255,0.25); }
  textarea::placeholder { color: rgba(255,255,255,0.25); }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
`;
document.head.appendChild(globalStyle);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/tags" element={<TagSelect />} />
        <Route path="/fridge" element={<Fridge />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/ai" element={<AIChat />} />
        <Route path="/calendar" element={<Calendar />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;