"use strict";

$(function () {
  var projectId = $("#projectId").val();
  var apiBase = AJAX_URL + "/manager";
  var columns = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"];
  var colorMap = { ASSIGNED: "warning", IN_PROGRESS: "info", COMPLETED: "success" };
  var avatarColors = ["success", "danger", "warning", "info", "primary", "secondary"];

  function getInitials(name) {
    if (!name) return "?";
    var w = name.split(" ").filter(Boolean);
    return ((w[0] || "").charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : "")).toUpperCase();
  }

  function getAvatarColor(name) {
    var ci = 0;
    for (var i = 0; i < (name || "").length; i++) ci += (name || "").charCodeAt(i);
    return avatarColors[ci % avatarColors.length];
  }

  function formatDate(d) {
    if (!d) return "";
    var dt = new Date(d);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function buildCard(task) {
    var initials = getInitials(task.assignedTo?.name || task.assignedTo?.email);
    var bg = getAvatarColor(task.assignedTo?.name || task.assignedTo?.email || "");
    var dateBadges = "";
    if (task.assignDate) {
      dateBadges += '<span class="badge bg-label-primary" style="font-size:0.7rem;">' +
        '<i class="ti ti-calendar-event me-1"></i>' + formatDate(task.assignDate) + "</span>";
    }
    if (task.dueDate) {
      var isOverdue = new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";
      dateBadges += '<span class="badge bg-label-' + (isOverdue ? "danger" : "secondary") + '" style="font-size:0.7rem;">' +
        '<i class="ti ti-calendar-due me-1"></i>' + formatDate(task.dueDate) + "</span>";
    }

    return (
      '<div class="kanban-card" data-task-id="' + task.id + '">' +
        '<div class="d-flex justify-content-between align-items-start">' +
          '<div class="card-title">' + $("<span>").text(task.title).html() + "</div>" +
          '<button class="delete-task" title="Delete" data-task-id="' + task.id + '"><i class="ti ti-trash"></i></button>' +
        "</div>" +
        (task.description ? '<div class="card-desc">' + $("<span>").text(task.description).html() + "</div>" : "") +
        '<div class="card-meta">' +
          '<div class="d-flex align-items-center gap-2">' +
            '<span class="avatar-xs bg-' + bg + '">' + initials + "</span>" +
            '<span>' + $("<span>").text(task.assignedTo?.name || task.assignedTo?.email || "—").html() + "</span>" +
          "</div>" +
          '<div class="d-flex gap-1">' + dateBadges + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function renderTasks(tasks) {
    columns.forEach(function (status) {
      $("#col-" + status).empty();
    });

    var counts = { ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    tasks.forEach(function (task) {
      var col = $("#col-" + task.status);
      if (col.length) {
        col.append(buildCard(task));
        counts[task.status]++;
      }
    });

    columns.forEach(function (status) {
      $(".task-count[data-status='" + status + "']").text(counts[status]);
    });
  }

  function loadTasks() {
    $.ajax({
      url: apiBase + "/api/projects/" + projectId + "/tasks",
      type: "GET",
      dataType: "json",
      xhrFields: { withCredentials: true },
      success: function (data) {
        renderTasks(data.tasks || []);
      },
      error: function (xhr) {
        console.error("Failed to load tasks:", xhr);
        Swal.fire({ icon: "error", title: "Error", text: "Failed to load tasks." });
      },
    });
  }

  function updateStatus(taskId, newStatus) {
    $.ajax({
      url: apiBase + "/api/tasks/" + taskId + "/status",
      type: "PUT",
      contentType: "application/json",
      data: JSON.stringify({ status: newStatus }),
      xhrFields: { withCredentials: true },
      success: function () {
        loadTasks();
      },
      error: function (xhr) {
        console.error("Failed to update status:", xhr);
        Swal.fire({ icon: "error", title: "Error", text: "Failed to update task status." });
        loadTasks();
      },
    });
  }

  // Init SortableJS on each column
  columns.forEach(function (status) {
    var el = document.getElementById("col-" + status);
    if (el) {
      new Sortable(el, {
        group: "kanban",
        animation: 200,
        ghostClass: "sortable-ghost",
        dragClass: "sortable-drag",
        onEnd: function (evt) {
          var taskId = $(evt.item).data("task-id");
          var newStatus = $(evt.to).data("status");
          if (taskId && newStatus) {
            updateStatus(taskId, newStatus);
          }
        },
      });
    }
  });

  // Create task form
  $("#createTaskForm").on("submit", function (e) {
    e.preventDefault();
    var title = $.trim($("#taskTitle").val());
    var description = $.trim($("#taskDescription").val());
    var assignedToId = $("#taskAssignee").val();
    var assignDate = $("#taskAssignDate").val();
    var dueDate = $("#taskDueDate").val();

    $(".is-invalid").removeClass("is-invalid");
    $(".invalid-feedback").text("");

    var valid = true;
    if (!title) {
      $("#taskTitle").addClass("is-invalid");
      $("#taskTitleError").text("Title is required");
      valid = false;
    }
    if (!assignedToId) {
      $("#taskAssignee").addClass("is-invalid");
      $("#taskAssigneeError").text("Assignee is required");
      valid = false;
    }
    if (!valid) return;

    var payload = { title: title, assignedToId: parseInt(assignedToId) };
    if (description) payload.description = description;
    if (assignDate) payload.assignDate = assignDate;
    if (dueDate) payload.dueDate = dueDate;

    $("#createTaskBtn").prop("disabled", true).text("Creating...");

    $.ajax({
      url: apiBase + "/api/projects/" + projectId + "/tasks",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
      xhrFields: { withCredentials: true },
      success: function () {
        $("#createTaskModal").modal("hide");
        $("#createTaskForm")[0].reset();
        loadTasks();
        Swal.fire({ icon: "success", title: "Created", text: "Task created successfully.", timer: 1500, showConfirmButton: false });
      },
      error: function (xhr) {
        var msg = (xhr.responseJSON && xhr.responseJSON.error) || "Failed to create task";
        Swal.fire({ icon: "error", title: "Error", text: msg });
      },
      complete: function () {
        $("#createTaskBtn").prop("disabled", false).text("Create Task");
      },
    });
  });

  // Delete task
  $(document).on("click", ".delete-task", function (e) {
    e.stopPropagation();
    var taskId = $(this).data("task-id");
    Swal.fire({
      title: "Delete Task?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ea5455",
      confirmButtonText: "Yes, delete",
    }).then(function (result) {
      if (result.isConfirmed) {
        $.ajax({
          url: apiBase + "/api/tasks/" + taskId,
          type: "DELETE",
          xhrFields: { withCredentials: true },
          success: function () {
            loadTasks();
          },
          error: function (xhr) {
            console.error("Failed to delete task:", xhr);
            Swal.fire({ icon: "error", title: "Error", text: "Failed to delete task." });
          },
        });
      }
    });
  });

  // Initial load
  loadTasks();
});
