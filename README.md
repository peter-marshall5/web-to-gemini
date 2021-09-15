# What is this?
This is a proxy to access Web pages over Gemini.
gemini.circumlunar.space

# Web to Gemini Proxy
To use the proxy, add "gemini://localhost/proxy/"  to the URL of any website replacing "://" with "/~".

Example:
[gemini://localhost/proxy/https/~gemini.circumlunar.space/](gemini://localhost/proxy/https/~gemini.circumlunar.space/)
# How it Works
This proxy is programmed in Node.js. It uses a slightly modified version of gemini-server by Joshua Kaplan. Mozilla's readability library is used as a first stage to "distill" web pages which are then passed through a custom HTML analyzer to convert the page to Gemini.
