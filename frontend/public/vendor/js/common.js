$(document).ready(function() {
    // When the file upload button is clicked
    $(document).on("click", ".file-upload-btn", function(e) {
        e.preventDefault();
        // Trigger the hidden file input
        $(this).siblings("input[type='file']").trigger("click");
    });

    // Handle file input change event to show the image preview
    $(document).on("change", "input[type='file']", function() {
      const fileInput = $(this);
      const inputName = fileInput.attr('name').replace('[]', '');
      const previewContainer = fileInput.closest('.col-md-6').find(`.${inputName}_preview`);
      const files = fileInput[0].files;

      if (files && files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = $('<img />', {
            src: e.target.result,
            class: 'img-fluid',
            width: '100px'
          });
          previewContainer.html(img);
        };
        reader.readAsDataURL(files[0]);
      }
    });

});

const style = document.createElement('style');
style.textContent = `
  .ck-editor__editable_inline {
    min-height: 300px;
  }
`;
document.head.appendChild(style);
document.addEventListener('DOMContentLoaded', (event) => {
    // Find all textarea elements with the 'editor' class
    const editorElements = document.querySelectorAll('textarea.editor');
  
    // Initialize CKEditor 5 on each textarea
    editorElements.forEach((element) => {
      ClassicEditor
      .create(element, {
        toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote'],

        heading: {
          options: [
            {
              model: 'paragraph',
              title: 'Paragraph',
              class: 'ck-heading_paragraph'
            },
            {
              model: 'heading1',
              view: 'h1',                 
              title: 'Heading 1',
              class: 'ck-heading_heading1'
            },
            {
              model: 'heading2',
              view: 'h2',                 
              title: 'Heading 2',
              class: 'ck-heading_heading2'
            },
            {
              model: 'heading3',
              view: 'h3',                 
              title: 'Heading 3',
              class: 'ck-heading_heading3'
            }
          ]
        },

        placeholder: 'Type your content here...',
      })
      .then(editor => {
        editor.model.document.on('change:data', () => {
          element.value = editor.getData();
        });
      })
      .catch(() => {});

    });
});

function goToStep(e, currentStep, nextStep) {
  e.preventDefault();
  $('#' + currentStep).addClass("content");
  $('#' + nextStep).removeClass("content");
  $('[data-target="#' + currentStep + '"]').removeClass("active");
  $('[data-target="#' + nextStep + '"]').addClass("active");
}

function findParentContainer(inputId) {
  var inputElement = document.getElementById(inputId);
  if (inputElement) {
    var parentContainer = inputElement.closest('[id^="step-"]');
    return parentContainer ? parentContainer.id : null;
  }
  return null;
}