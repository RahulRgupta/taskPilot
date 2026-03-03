"use strict";

$(function () {
  var orgView = ADMIN_URL + "/admin/organizations/";

  var statusFilter = document.getElementById("orgStatusFilter");

  var dt = $("#organizationsTable").DataTable({
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
      url: AJAX_URL + "/admin/organizations/getList",
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

        var filter = statusFilter ? statusFilter.value : "";
        if (filter) {
          params.statusFilter = filter;
        }

        return params;
      },
      error: function (xhr, error, thrown) {
        console.error("DataTables error:", { xhr: xhr, error: error, thrown: thrown });
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "An error occurred while fetching data. Please try again.",
        });
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
            '<div class="d-flex align-items-center gap-1">' +
            '<a href="' + orgView + full.id + '" class="dt-action-btn" title="View"><i class="ti ti-eye"></i></a>' +
            "</div>"
          );
        },
      },
      { data: "id", width: "5%" },
      {
        data: "name",
        width: "22%",
        responsivePriority: 1,
        render: function (data, type, full) {
          if (type === "sort" || type === "filter") {
            return full.name + " " + full.email;
          }

          var name = full.name || "";
          var email = full.email || "";
          var words = name.split(" ").filter(Boolean);
          var initials = ((words[0] || "").charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : "")).toUpperCase();

          var colors = [
            "success", "danger", "warning", "info", "primary", "secondary",
          ];
          var colorIdx = 0;
          for (var i = 0; i < name.length; i++) {
            colorIdx += name.charCodeAt(i);
          }
          var bgClass = colors[colorIdx % colors.length];

          return (
            '<div class="d-flex justify-content-start align-items-center">' +
            '<div class="avatar-wrapper">' +
            '<div class="avatar me-3">' +
            '<span class="avatar-initial rounded-circle bg-label-' + bgClass + '">' + initials + "</span>" +
            "</div>" +
            "</div>" +
            '<div class="d-flex flex-column">' +
            '<a href="' + orgView + full.id + '" class="text-body text-truncate"><span class="fw-medium">' + name + "</span></a>" +
            '<small class="text-muted">' + email + "</small>" +
            "</div>" +
            "</div>"
          );
        },
      },
      { data: "phone", width: "10%" },
      { data: "address", width: "15%" },
      { data: "usersCount", width: "7%", searchable: false },
      {
        data: "status",
        width: "8%",
        render: function (data, type, full) {
          if (type === "sort" || type === "filter") return data;
          var cls = full.isActive ? "success" : "secondary";
          return '<span class="badge bg-label-' + cls + '">' + data + "</span>";
        },
      },
      {
        data: "isVerified",
        width: "8%",
        searchable: false,
        render: function (data, type, full) {
          if (type === "sort" || type === "filter") return data ? "1" : "0";
          var verified = full.isVerified !== false;
          return verified
            ? '<span class="badge bg-label-success">Verified</span>'
            : '<span class="badge bg-label-warning text-dark">Pending</span>';
        },
      },
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
    language: {
      search: "",
      searchPlaceholder: "Search organizations...",
    },
  });

  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      dt.ajax.reload();
    });
  }
});
