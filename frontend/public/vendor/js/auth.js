// Form submission event handler
$("#signinForm").on("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  console.log("Response data:", formData);
  postForm("admin/authentication", formData, (status, data) => {
    console.log("Response data:", data);
    if (status === 200 && data.success === true) {
      // Set the cookie on the frontend server
      $.ajax({
        url: BASE_URL + "admin/set-auth-cookie",
        method: "POST",
        data: JSON.stringify({ token: data.token }),
        contentType: "application/json",
        success: function () {
          window.location.href = BASE_URL + data.redirectUrl;
        },
        error: function (xhr, status, error) {
          console.error("Failed to set cookie:", error);
        },
      });
    }
  });
});
