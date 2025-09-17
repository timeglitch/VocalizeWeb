import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import Main from './Main';
import Modules from './Modules';
import VowelSubmodules from './VowelSubmodules';
import StressSubmodules from './StressSubmodules';
import SubmoduleDropdown from './SubmoduleDropdown';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/modules" element={<Modules />} />
      <Route path="/main" element={<Main />} />
      <Route path="/VowelSubmodules" element={<VowelSubmodules />} />
      <Route path="/StressSubmodules" element={<StressSubmodules />} />
      <Route path="/SubmoduleDropdown" element={<SubmoduleDropdown />} />
    </Routes>
  );
}