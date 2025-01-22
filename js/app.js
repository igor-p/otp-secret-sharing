// Solution taken from https://bitcoin.stackexchange.com/a/65434

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
  encryptOutputByLocation: document.querySelector("[data-encrypt-output-by-location]"),
  encryptOutputsLocationCards: document.querySelector("[data-encrypt-output-locations]"),
  allCardContents: document.querySelectorAll(`[data-encrypt-output] [data-card-content], [data-encrypt-output-by-location] [data-card-content]`),
  templateCopyLink: document.querySelector("template[data-template='copy-action']"),
  decryptInputs: document.querySelectorAll("[data-decrypt-input]"),
  decryptOutput: document.querySelector("[data-decrypt-output]"),
  onlineAlert: document.querySelector("[data-online-alert]"),
  copyPlaceholders: document.querySelectorAll("[data-action-copy-placeholder]"),
};


function init() {
  setupCopyActions();

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

function setupCopyActions() {
  /*
    Adding copy to clipboard functionality requires the following data attributes in the html:
      * data-action-copy-container: contains everything
      * data-action-copy-placeholder: where the copy icon link is going to go
      * data-action-copy-content: the content wrapping the text that gets copied on click
   */
  DOM.copyPlaceholders.forEach(placeholder => {
    const container = placeholder.closest("[data-action-copy-container]");
    const content = container.querySelector("[data-action-copy-content]");

    placeholder.append(DOM.templateCopyLink.content.cloneNode(true));

    // Allow for debounced action to auto-hide message after click (hide X seconds after last click)
    // One per click icon/action
    let timeout;

    // Can't add listeners to template fragments; must add after appending
    placeholder.querySelector("a").addEventListener("click", async (evt) => {
      evt.preventDefault();
      const link = evt.currentTarget;
      const iconDefault = link.querySelector("[data-icon-default]");
      const iconSuccess = link.querySelector("[data-icon-success]");

      await navigator.clipboard.writeText(content.innerText);
      link.classList.add("text-success");
      iconDefault.classList.add("d-none");
      iconSuccess.classList.remove("d-none");

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        link.classList.remove("text-success");
        iconDefault.classList.remove("d-none");
        iconSuccess.classList.add("d-none");
      }, 3000)
    });

  });
}

function handleEncryptInputChange(evt) {
  console.log("handleChange");
  // Clear error and outputs
  setEncryptInputError(null);
  DOM.allCardContents.forEach(el => el.innerText = "");

  const words = evt.target.value.trim().split(/\s+/);
  let cyphers = null;
  try {
    cyphers = splitSecret(words);
  } catch (e) {
    setEncryptInputError(e.message);
  }

  if (!cyphers) {
    return;
  }

  // Clean up input
  evt.target.value = words.join(" ");

  // Fill segment-based output cards (A1, A2, etc)
  ["A1", "A2", "B1", "B2"].forEach(label => {
    const phrase = cyphers[label] ? cyphers[label].phrase : "";
    const cardSelector = `[data-encrypt-output="${label}"]`
    const card = DOM.encryptOutputs.querySelector(cardSelector);

    if (!card) {
      throw new Error(`Could not find element matching selector ${cardSelector}`)
    }
    const content = card.querySelector("[data-card-content]");
    content.innerText = phrase;
  })

  const fillLocationOutput = (keys) => keys.map(key => `${key}:\n${cyphers[key].phrase}`)
    .join("\n\n\n");

  // Fill the location-based output cards (Location 1, Location 2, etc)
  const keysByLocation = [
    fillLocationOutput(["A1", "A2"]),
    fillLocationOutput(["A1", "B2"]),
    fillLocationOutput(["B1", "A2"]),
  ];

  keysByLocation.forEach((text, i) => {
    const num = i + 1;
    const container = document.querySelector(`[data-encrypt-output-location="${num}"]`);
    container.querySelector("[data-card-content]").innerText = text;
  });
}

function handleDecryptInputsChange() {
  const [inputA, inputB] = [...DOM.decryptInputs].map(input => input.value);
  const result = decryptSecret(inputA, inputB);
  DOM.decryptOutput.querySelector("[data-card-content]").innerText = result || "";
}

// Split a secret and return the split components
function splitSecret(seedWords) {
  if (!seedWords || !seedWords.length) return null;

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