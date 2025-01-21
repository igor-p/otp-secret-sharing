// Solution taken from https://bitcoin.stackexchange.com/a/65434

// snow town rural west grid resource chief lottery chunk crane always profit water zebra raise vacant fall zero sustain measure reward devote gun village
// cd9ccaf67cb6676f09f42028a6481e55ef7dff2c4f83523ff76bc4fb8a7999ff

// The regular % operator doesn't work as expected on negative numbers
// e.g. -6 % 5 should be 4, but, in JS, it's -1
// let n = -6; n.mod(5) === 4
Number.prototype.mod = function (n) {
  "use strict";
  return ((this % n) + n) % n;
};


const WORDS = wordsTxt.split("\n").filter(Boolean);

// Key elements
const DOM = {
  encryptInput: document.querySelector("[data-encrypt-input]"),
  encryptInputError: document.querySelector("[data-encrypt-input-error]"),
  encryptOutputs: document.querySelector("[data-encrypt-outputs]"),
  templateCopyLink: document.querySelector("template[data-template='copy-action']"),
  decryptInputs: document.querySelectorAll("[data-decrypt-input]"),
  decryptOutput: document.querySelector("[data-decrypt-output]"),
  onlineAlert: document.querySelector("[data-online-alert]"),
};


function init() {
  setupEncryptCardsCopyAction();
  setupDecryptCardCopyAction();

  // Watch the text input for the encryption flow
  DOM.encryptInput.addEventListener("input", handleEncryptInputChange);

  // Watch the text inputs for the decryption flow
  DOM.decryptInputs.forEach(input => input.addEventListener("input", handleDecryptInputsChange))

  // Check if the user is online and show an alert if so
  // For security purposes, this should ideally be done in an air-gapped system
  if (navigator.onLine) {
    DOM.onlineAlert.classList.remove("d-none")
  } else {
    DOM.onlineAlert.classList.add("d-none")
  }
}

init();

function setupDecryptCardCopyAction() {
  // Append copy icon to decrypt output card (i.e. where the decrypted seed phrase will appear)
  const copyLink = DOM.templateCopyLink.content.cloneNode(true);
  const cardHeader = DOM.decryptOutput.querySelector("[data-card-header]");
  cardHeader.append(copyLink);

  let timeout;
  // Listener needs to be added after appending (no listeners on template fragments)
  DOM.decryptOutput.querySelector("[data-action='copy']").addEventListener("click", async (evt) => {
    evt.preventDefault();
    const content = DOM.decryptOutput.querySelector("[data-card-content]");
    await navigator.clipboard.writeText(content.innerText);

    // show auto-disappearing message for user feedback that the copy button was clicked
    const message = cardHeader.querySelector("[data-card-message]");
    message.innerText = "Copied to clipboard!";
    clearTimeout(timeout);
    timeout = setTimeout(() => message.innerText = "", 3000)
  });
}

function setupEncryptCardsCopyAction() {
  DOM.encryptOutputs.querySelectorAll("[data-card-header]").forEach(header => {
    const copyAction = DOM.templateCopyLink.content.cloneNode(true)
    header.append(copyAction);

    let timeout;

    header.querySelector("[data-action='copy']").addEventListener("click", async (evt) => {
      evt.preventDefault();
      const card = evt.currentTarget.closest("[data-encrypt-output]");
      const header = card.querySelector("[data-card-header]");
      const content = card.querySelector("[data-card-content]");

      await navigator.clipboard.writeText(content.innerText);
      const message = header.querySelector("[data-card-message]");
      message.innerText = "Copied to clipboard!";
      clearTimeout(timeout);
      timeout = setTimeout(() => message.innerText = "", 3000)
    });
  });
}

function handleDecryptInputsChange() {
  const [inputA, inputB] = [...DOM.decryptInputs].map(input => input.value);
  const result = decryptSecret(inputA, inputB);
  if (result) {
    DOM.decryptOutput.querySelector("[data-card-content]").innerText = result;
  }
}

function handleEncryptInputChange(evt) {
  setEncryptInputError(null);

  let cyphers = {};
  try {
    cyphers = splitSecret(evt.target.value);
  } catch (e) {
    setEncryptInputError(e.message);
  }

  DOM.encryptOutputs
    .querySelectorAll(`[data-encrypt-output] [data-card-content]`)
    .forEach(el => el.innerText = "");

  ["A1", "A2", "B1", "B2"].forEach(label => {
    const phrase = cyphers[label] ? cyphers[label].phrase : "";
    const card = DOM.encryptOutputs.querySelector(`[data-encrypt-output="${label}"]`);
    const content = card.querySelector("[data-card-content]");
    content.innerText = phrase;
  })
}


// Split a secret and return the split components
function splitSecret(seedPhrase) {
  if (!seedPhrase) return;

  const seedWords = seedPhrase.trim().split(/\s+/);

  // convert into array of 11-bit dictionary indexes (0 - 2047) of the words in the word list
  const S = seedWords.map(toDictionaryIndex);

  const size = S.length;
  const output = {};

  for (const n of [1, 2]) { // 2 pairs of keys
    // S = A + B

    // A will be an array of random values (of same size and range as S)
    const A = crypto.getRandomValues(new Uint16Array(size)).map(randomN => randomN % 2048);
    // B = S - A
    const B = A.map((aNum, i) => (S[i] - aNum).mod(2048));

    // convert A and B from numbers to seed phrases
    [[`A${n}`, A], [`B${n}`, B]]
      .forEach(([key, typedArray]) => {
        const phrase = [...typedArray].map(toWord).join(" ");
        const values = [...typedArray];
        output[key] = {
          numerical: values,
          phrase
        };
      });
  }

  return output;
}

function decryptSecret(inputA, inputB) {
  if (!inputA || !inputB) {
    return null;
  }
  // A and B will be numeric arrays (dictionary indexes)
  let A, B;

  try {
    [A, B] = [inputA, inputB]
      .map(phrase => phrase.split(/\s+/).map(toDictionaryIndex));
  } catch (e) {
    return null;
  }
  if (A.length !== B.length) {
    return null;
  }

  // S = A + B
  return A
    .map((aNum, i) => {
      const bNum = B[i];
      return (aNum + bNum).mod(2048);
    })
    .map(toWord).join(" ");
}

function setEncryptInputError(message) {
  if (message) { // clear error if falsy
    DOM.encryptInput.classList.add("is-invalid");

    DOM.encryptInputError.innerText = message;
    DOM.encryptInputError.classList.remove("d-none"); // show
  } else {
    DOM.encryptInput.classList.remove("is-invalid");
    DOM.encryptInputError.classList.add("d-none"); // hide
  }
}

function toDictionaryIndex(word) {
  const idx = WORDS.findIndex(w => w === word);
  if (idx < 0) {
    throw Error(
      `Invalid input! Could not find "${word}" in wordlist!\
      Make sure to only use words in the BIP 39 word list`
    );
  }
  return idx;
}

function toWord(dictionaryIndex) {
  const word = WORDS[dictionaryIndex];
  if (!word) {
    throw Error(`Could not find word at position ${dictionaryIndex}!`);
  }
  return word;
}