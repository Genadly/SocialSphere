function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (text === "") return;

    const messageContainer = document.querySelector(".messages");

    const newMessage = document.createElement("div");
    newMessage.classList.add("message");
    newMessage.textContent = text;

    messageContainer.appendChild(newMessage);

    input.value = "";
    messageContainer.scrollTop = messageContainer.scrollHeight;
}