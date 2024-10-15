const min = 0;
const max = 1;
const step = 0.1;
const slider = document.getElementById('myRange');
const ticksContainer = document.getElementById('ticks');

const numTicks = (max - min) / step;

for (let i = 0; i <= numTicks; i++) {
    const tick = document.createElement('div');
    ticksContainer.appendChild(tick);
}

let sliderValue;

function sliderUpdate(value) {
    sliderValue = value;
    localStorage.setItem("sensitivity", sliderValue);
}