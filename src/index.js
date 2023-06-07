import React from 'react';
import { createRoot } from 'react-dom/client';

import Repository from './Components/Repository';

import './app.scss';


function App() {
	// const [state, setState] = React.useState("Hello, world!");
	// const [counter, setCounter] = React.useState(0);
	// <button onClick={() => setCounter(counter + 1)}>Increment</button>
	return(
		<div>
			<Repository />
		</div>
	)
}

const container = document.getElementById('root');
const root = createRoot(container); 
root.render(<App />);