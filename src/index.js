import React from 'react';
import { createRoot } from 'react-dom/client';

import Map from './Components/Map';

import './app.scss';


function App() {
	// const [state, setState] = React.useState("Hello, world!");
	// const [counter, setCounter] = React.useState(0);
	// <button onClick={() => setCounter(counter + 1)}>Increment</button>
	return(
		<div>
			<Map />
		</div>
	)
}

const container = document.getElementById('root');
const root = createRoot(container); 
root.render(<App />);