const BASE_URL = ADMIN_URL;

const httpClient = axios.create({
  baseURL: AJAX_URL,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "Access-Control-Allow-Origin": "*",
  },
});

// Add a request interceptor to include the Authorization header
httpClient.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers["Authorization"] = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
httpClient.interceptors.response.use(
  (response) => response, // Pass through the response if there's no error
  (error) => {
    if (!error.response) {
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not connect to the server. Please try again later.",
      });
    }
    return Promise.reject(error);
  }
);
$.ajaxSetup({
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
});

const postForm = (url, formData, callback = null, method = "POST") => {
  resetErrorMessages();
  for (const pair of formData.entries()) {
    console.log(pair[0] + ", " + pair[1], "PAIR");
  }
  var reqConfig = {
    url: url,
    method: method,
    data: formData,
  };
  console.log("MAKING REQUEST ", reqConfig);

  httpClient
    .request(reqConfig)
    .then((response) => {
      const { status, data } = response;
      if (callback) {
        callback(status, data);
      } else {
        handleResponse(status, data);
      }
    })
    .catch((error) => {
      console.log("ERROR", error);
      handleError(error);
    });
};

const handleResponse = (status, data) => {
  if (status === 200 && data.status === "REDIRECT") {
    window.location.href = BASE_URL + data.redirect;
  } else if (
    [201, 200].includes(status) &&
    data.status === "SUCCESS_ALERT_REDIRECT"
  ) {
    Swal.fire({
      icon: data.alertIcon,
      title: data.alertTitle,
      text: data.alertText,
    }).then(() => {
      window.location.href = BASE_URL + data.redirect;
    });
  } else if (
    [201, 200].includes(status) &&
    data.status === "SUCCESS_ALERT_RELOAD"
  ) {
    Swal.fire({
      icon: data.alertIcon,
      title: data.alertTitle,
      text: data.alertText,
    }).then(() => {
      window.location.reload();
    });
  }
};

const handleError = (error) => {
  const { status, data } = error.response || {};

  if (data && data.status === "ALERT") {
    Swal.fire({
      icon: data.alertIcon || "error",
      title: data.alertTitle || "Error",
      text: data.alertText || "Something went wrong",
    });
    return;
  }

  if (status === 422) {
    if (data && data.status === "VALIDATION_ERRORS") {
      handleValidationErrors(data.errors);
    } else if (data && data.status === "ALERT_BOX") {
      if (data.type === "error") {
        $(".alert-box-text").html(data.text);
        $("#dangerAlert").css("display", "block");
      }
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: (data && data.alertText) || "Validation failed",
      });
    }
  } else {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: (data && data.alertText) || "Internal server error",
    });
  }
};

const handleValidationErrors = (errors) => {
  let firstInputElement = null;

  Object.entries(errors).forEach(([inputElement, errorMessage], index) => {
    $(`label[for='${inputElement}']`).html(errorMessage);
    $(`#${inputElement}`).addClass("is-invalid");
    if (index === 0) {
      firstInputElement = inputElement;
    }
  });

  var stepContainer = findParentContainer(firstInputElement);
  if (stepContainer) {
    $("#" + stepContainer)
      .removeClass("content")
      .siblings('[id^="step-"]')
      .addClass("content");
    $('[data-target="#' + stepContainer + '"]')
      .addClass("active")
      .siblings(".step")
      .removeClass("active");
  }

  $(".invalid-feedback").css("display", "block");
  if (firstInputElement) {
    $(`#${firstInputElement}`).focus();
  }
};
const resetErrorMessages = () => {
  $(".invalid-feedback").html("");
  $(".invalid-feedback").css("display", "none");
  $("input, textarea, select").removeClass("is-invalid");
  $(".error").text("");
  $(".alert-box-text").html("");
  $("#dangerAlert").css("display", "none");
};

const deleteRecord = (url, formdata, callback) => {
  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  }).then((result) => {
    if (result.isConfirmed) {
      postForm(url, formdata, callback);
    }
  });
};

resetErrorMessages();
