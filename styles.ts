const style = document.createElement('style');
style.textContent = `
.transcriber-container {
    padding: 16px;
    background-color: white;
    border-radius: 8px;
}
.transcriber-title {
    text-align: center;
    font-weight: bold;
    margin-bottom: 16px;
    color: darkblue; /* Dark blue color */
    font-size: 20px; /* Font size for the title */
}
.transcriber-subtitle {
    text-align: center;
    color: darkblue; /* Dark blue color */
    font-size: 16px; /* Font size for the subtitle */
}
.transcriber-input {
    margin-bottom: 16px;
}
.button-container {
    text-align: center; /* Center child elements horizontally */
    width: 100%; /* Ensure it takes the full width of its parent */
}

.transcriber-button {
    border: 2px solid blue;
    margin-top: 5px;
    margin-bottom: 5px;
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
    background-color: white;
    color: blue; /* blue text */
    width:100px;
    display: inline-flex; /* Use flexbox */
    align-items: center; /* Center vertically */
    justify-content: center; /* Center horizontally */
}

.wide-input {
    width: 75%;
}
`;
document.head.appendChild(style);

// Add this line to make the file a module
export {};
