function random(number) {
  return Math.floor(Math.random() * (number + 1));
}

function bgChange(event) {
  const rndCol = `rgb(${random(255)} ${random(255)} ${random(255)})`;
  event.target.style.backgroundColor = rndCol;
}

document.querySelector('.demo-button')?.addEventListener('click', bgChange);
