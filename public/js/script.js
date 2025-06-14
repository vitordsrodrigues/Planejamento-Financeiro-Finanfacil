document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
        let flashMessage = document.getElementById("flash-message");
        if (flashMessage) {
            flashMessage.style.transition = "opacity 0.5s ease-out";
            flashMessage.style.opacity = "0";
            setTimeout(() => flashMessage.remove(), 500);
        }
    }, 6000); // A mensagem desaparecerá após 6 segundos
});

document.addEventListener("DOMContentLoaded", function () {
    const track = document.querySelector('.carousel-track');
  
    function pauseScroll() {
      track.style.animationPlayState = 'paused';
    }
  
    function resumeScroll() {
      track.style.animationPlayState = 'running';
    }
  
    // Você pode exportar essas funções se for usar em eventos inline
    window.pauseScroll = pauseScroll;
    window.resumeScroll = resumeScroll;
});
  