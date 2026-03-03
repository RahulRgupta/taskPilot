"use strict";

$(function () {
  var userEdit = ADMIN_URL + "/organization/users/";
  var roleFilter = document.getElementById("userRoleFilter");

  var dt = $("#usersTable").DataTable({
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
      url: AJAX_URL + "/organization/users/getList",
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
        var filter = roleFilter ? roleFilter.value : "";
        if (filter) params.roleFilter = filter;
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
            '<li><a class="dropdown-item" href="' + userEdit + full.id + '/edit"><i class="ti ti-edit me-2"></i>Edit</a></li>' +
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
          if (type === "sort" || type === "filter") return full.name + " " + full.email;
          var name = full.name || "";
          var email = full.email || "";
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
            '<span class="fw-medium">' + name + "</span>" +
            '<small class="text-muted">' + email + "</small>" +
            "</div></div>"
          );
        },
      },
      { data: "employeeCode", width: "8%" },
      {
        data: "role",
        width: "8%",
        render: function (data, type) {
          if (type === "sort" || type === "filter") return data;
          var cls = data === "MANAGER" ? "primary" : "info";
          return '<span class="badge bg-label-' + cls + '">' + data + "</span>";
        },
      },
      { data: "department", width: "10%" },
      { data: "jobTitle", width: "10%" },
      { data: "phone", width: "10%" },
      { data: "joinedAt", width: "10%" },
    ],
    scrollY: "600px",
    scrollX: true,
    dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6 d-flex justify-content-center justify-content-md-end"f>>t<"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
    language: { search: "", searchPlaceholder: "Search users..." },
  });

  if (roleFilter) {
    roleFilter.addEventListener("change", function () {
      dt.ajax.reload();
    });
  }
});
