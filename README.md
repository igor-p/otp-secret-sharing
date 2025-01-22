### What is this?

This is a simple app that cryptographically splits a [BIP39-compatible](https://github.com/bitcoin/bips) seed phrase
into multiple key pairs using [one-time pad](https://en.wikipedia.org/wiki/One-time_pad) encryption.

### Why?
This allows you to split the seed phrase into 3 fragments that can be stored separately.
You will only need 2 of the fragments to reconstruct the original seed phrase.
**A single fragment contains no information about the other fragments and would not help an attacker in brute-forcing the encryption.**

This app is written in vanilla JS, has 0 external dependencies, and is designed to work offline or in an air-gapped environment.

> [!CAUTION]
> I am not responsible for lost, stolen, or otherwise compromised seed phrases or encrypted keys.
> I make no guarantees to the effectiveness of the encryption/decryption or the results.
> 
> Always test, backup, and consider using additional key splitting methods for extra security.

### Usage instructions
1. Clone repo
2. Turn off your internet
3. Open `index.html`

### Encrypting
1. Simply input a seed phrase into the top input to generate key pairs
2. You will see 4 keys: `A1`, `A2`, `B1`, and `B2`. This constitutes two pairs:
   1. `A1` and `B1`
   2. `A2` and `B2`

**A complete pair is sufficient to decrypt the original seed phrase.**

### Storing keys
The keys should be stored in 3 fragments in separate locations, as follows:
* Fragment 1: `A1`, `A2`
* Fragment 2: `A1`, `B2`
* Fragment 3: `B1`, `A2`

This way, any **2** fragments will be able to construct a complete key pair.

Using a 2-out-of-3 authentication framework can accommodate:
* loss of a single fragment
* compromise of a single fragment

### Decrypting instructions
1. Paste the two keys of a complete pair into the inputs on the bottom half of the app
 