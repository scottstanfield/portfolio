$(document).ready(function() {
    // Toggle fallback button
    $(".toggle-fallback").click(function() {
        $("html").toggleClass("wf-inactive");
        $("html").removeClass("wf-active");
        $("body").removeClass("font-correct-inactive");
        $("#loading-message").addClass("stay-hidden");
    });

    // Font correct toggle button
    $(".toggle-fallback-correct").click(function(){
        $("body").toggleClass("font-correct-inactive");
    });
});
