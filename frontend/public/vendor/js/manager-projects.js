"use strict";

$(function () {
  var projectView = ADMIN_URL + "/manager/projects/";

  var dt = $("#projectsTable").DataTable({
    processing: true,
    serverSide: true,
    lengthChange: true,
    pageLength: 20,
    lengthMenu: [
      [10, 20, 50, 100, -1],
      [10, 20, 50, 100, "All"],
    ],
    autoWidth: true,
    searching: true,
    order: [[1, "desc"]],
    ajax: {
      url: AJAX_URL + "/manager/projects/getList",
      type: "GET",
      dataType: "json",
      xhrFields: { withCredentials: true },
      data: function (params) {
        params.order = params.order.map(function (order) {
          return {
            column: params.columns[order.column].data,
            dir: order.dir,
          };
        });
        return params;
      },
      error: function (xhr, error, thrown) {
        console.error("DataTables error:", { xhr: xhr, error: error, thrown: thrown });
        Swal.fire({ icon: "error", title: "Error", text: "An error occurred while fetching data." });
      },
    },
    columns: [
      {
        data: "actions",
        width: "7%",
        searchable: false,
        orderable: false,
        render: function (data, type, full) {
          return (
            '<div class="dropdown">' +
            '<button class="dt-action-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false">&#8942;</button>' +
            '<ul class="dropdown-menu dropdown-menu-start">' +
            '<li><a class="dropdown-item" href="' + projectView + full.id + '"><i class="ti ti-eye me-2"></i>View</a></li>' +
            '<li><a class="dropdown-item" href="' + projectView + full.id + '/tasks"><i class="ti ti-subtask me-2"></i>Task Board</a></li>' +
            "</ul></div>"
          );
        },
      },
      { data: "id", width: "5%" },
      {
        data: "name",
        width: "20%",
        responsivePriority: 1,
        render: function (data, type, full) {
          if (type === "sort" || type === "filter") return data;
          var name = full.name || "";
          var words = name.split(" ").filter(Boolean);
          var initials = ((words[0] || "").charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : "")).toUpperCase();
          var colors = ["success", "danger", "warning", "info", "primary", "secondary"];
          var ci = 0;
          for (var i = 0; i < name.length; i++) ci += name.charCodeAt(i);
          var bg = colors[ci % colors.length];
          return (
            '<div class="d-flex justify-content-start align-items-center">' +
            '<div class="avatar-wrapper"><div class="avatar me-3">' +
            '<span class="avatar-initial rounded-circle bg-label-' + bg + '">' + initials + "</span>" +
            "</div></div>" +
            '<div class="d-flex flex-column">' +
            '<a href="' + projectView + full.id + '" class="text-body text-truncate"><span class="fw-medium">' + name + "</span></a>" +
            '<small class="text-muted">' + (full.description !== "—" ? full.description : "") + "</small>" +
            "</div></div>"
          );
        },
      },
      { data: "createdByName", width: "12%" },
      {
        data: "status",
        width: "10%",
        render: function (data) {
          var labels = {
            PLANNING: "secondary",
            ACTIVE: "success",
            ON_HOLD: "warning",
            COMPLETED: "info"
          };
          var text = (data || "PLANNING").replace(/_/g, " ");
          var lbl = labels[data] || "secondary";
          return '<span class="badge bg-label-' + lbl + '">' + text + "</span>";
        }
      },
      {
        data: "priority",
        width: "8%",
        render: function (data) {
          var labels = {
            LOW: "secondary",
            MEDIUM: "warning",
            HIGH: "danger"
          };
          var lbl = labels[data] || "secondary";
          return '<span class="badge bg-label-' + lbl + '">' + (data || "MEDIUM") + "</span>";
        }
      },
      { data: "employeesCount", width: "8%", searchable: false },
      {
        data: "createdAt",
        width: "10%",
        render: function (data, type) {
          if (type === "sort") return new Date(data).getTime();
          return data;
        },
      },
    ],
    scrollY: "600px",
    scrollX: true,
    dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6 d-flex justify-content-center justify-content-md-end"f>>t<"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
    language: { search: "", searchPlaceholder: "Search projects..." },
  });
});
