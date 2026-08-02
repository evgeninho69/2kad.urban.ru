class TextScramble {
  constructor(element) {
    this.element = element;
    this.characters = '!<>-_\\/[]{}—=+*^?#_0101';
    this.frame = 0;
    this.queue = [];
    this.frameRequest = null;
    this.resolve = null;
    this.update = this.update.bind(this);
  }

  setText(nextText) {
    const oldText = this.element.innerText;
    const length = Math.max(oldText.length, nextText.length);
    const promise = new Promise((resolve) => {
      this.resolve = resolve;
    });

    this.queue = [];

    for (let index = 0; index < length; index += 1) {
      const from = oldText[index] || '';
      const to = nextText[index] || '';
      const start = Math.floor(Math.random() * 24);
      const end = start + Math.floor(Math.random() * 24);
      this.queue.push({ from, to, start, end });
    }

    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();

    return promise;
  }

  randomChar() {
    return this.characters[Math.floor(Math.random() * this.characters.length)];
  }

  update() {
    let output = '';
    let completed = 0;

    for (let index = 0; index < this.queue.length; index += 1) {
      let { from, to, start, end, char } = this.queue[index];

      if (this.frame >= end) {
        completed += 1;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[index].char = char;
        }

        output += `<span class="muted">${char}</span>`;
      } else {
        output += from;
      }
    }

    this.element.innerHTML = output;

    if (completed === this.queue.length) {
      this.resolve();
      return;
    }

    this.frameRequest = requestAnimationFrame(this.update);
    this.frame += 1;
  }
}

export function initScramble({ reduceMotion = false } = {}) {
  const nodes = document.querySelectorAll('.scramble-text');
  if (!nodes.length) return;

  nodes.forEach((node) => {
    const targetText = node.getAttribute('data-text') || node.innerText;

    if (reduceMotion) {
      node.innerText = targetText;
      return;
    }

    const triggerRoot = node.closest('[data-scramble-card]') || node;
    const scramble = new TextScramble(node);
    let busy = false;

    const trigger = () => {
      if (busy) return;
      busy = true;

      scramble.setText(targetText).finally(() => {
        busy = false;
      });
    };

    triggerRoot.addEventListener('mouseenter', trigger);
    triggerRoot.addEventListener('focusin', trigger);
  });
}
