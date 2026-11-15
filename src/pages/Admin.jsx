
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  UserRound,
  GraduationCap,
  BriefcaseBusiness,
  CalendarDays,
  Filter,
} from "lucide-react";

import { adminApi } from "../api";
import {
  Card,
  Notice,
  PageHeading,
  Spinner,
  Stat,
  Status,
  EmptyState,
} from "../components/UI";

const dateLabel = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString();
};

// ==========================================
// ADMIN DASHBOARD / OVERVIEW
// ==========================================

export function AdminDashboard() {
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.users,
  });

  const verify = useMutation({
    mutationFn: adminApi.verifyAudit,
  });

  const list = users.data || [];

  return (
    <>
      <PageHeading
        title="Administration"
        subtitle="A minimal overview of platform access and audit integrity."
      />

      <div className="stats-grid">
        <Stat
          label="Registered users"
          value={String(list.length).padStart(2, "0")}
          note="Across all platform roles"
          icon={Users}
        />

        <Stat
          label="Student accounts"
          value={String(
            list.filter(
              (u) => u.role === "STUDENT" && u.active !== false
            ).length
          ).padStart(2, "0")}
          note="Active student access"
          icon={GraduationCap}
        />

        <Stat
          label="Audit verification"
          value={
            verify.data
              ? verify.data.valid
                ? "Valid"
                : "Issue found"
              : "Not run"
          }
          note="Append-only hash chain"
          icon={ShieldCheck}
          tone={verify.data?.valid ? "green" : "amber"}
        />

        <Stat
          label="Last verification"
          value={
            verify.data
              ? new Date(verify.data.verifiedAt).toLocaleTimeString(
                  [],
                  { hour: "2-digit", minute: "2-digit" }
                )
              : "—"
          }
          note={
            verify.data
              ? dateLabel(verify.data.verifiedAt)
              : "Run a verification"
          }
          icon={CheckCircle2}
        />
      </div>

      <div className="dashboard-grid">
        <Card>
          <div className="panel-heading">
            <div>
              <h2>User management</h2>
              <p>Overview of registered platform users.</p>
            </div>
          </div>

          {users.isLoading ? (
            <Spinner />
          ) : users.isError ? (
            <Notice kind="error">
              Unable to load users.
            </Notice>
          ) : (
            <div className="data-list">
              {list.map((user) => (
                <div className="data-row" key={user.id}>
                  <div className="data-main">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>

                  <div className="data-end">
                    <Status status={user.role} />
                    <span className="muted">
                      {user.joined || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <AuditSummary verify={verify} />
      </div>
    </>
  );
}

// ==========================================
// AUDIT SUMMARY CARD
// ==========================================

function AuditSummary({ verify }) {
  return (
    <Card>
      <div className="panel-heading">
        <div>
          <h2>Audit integrity</h2>
          <p>
            Verify the append-only, hash-chained audit event history.
          </p>
        </div>

        <span className="stat-icon green">
          <ShieldCheck size={18} />
        </span>
      </div>

      <p className="muted audit-copy">
        Verification recomputes the event hash chain and reports
        the first broken row, if one exists. This action is read-only.
      </p>

      <button
        className="button primary"
        onClick={() => verify.mutate()}
        disabled={verify.isPending}
      >
        {verify.isPending
          ? "Verifying…"
          : "Verify audit chain"}

        <ShieldCheck size={16} />
      </button>

      {verify.isError && (
        <Notice kind="error">
          Audit verification failed to run. Try again.
        </Notice>
      )}

      {verify.data && (
        <div
          className={`audit-result ${
            verify.data.valid ? "valid" : "invalid"
          }`}
        >
          {verify.data.valid ? (
            <CheckCircle2 size={19} />
          ) : (
            <AlertTriangle size={19} />
          )}

          <div>
            <strong>
              {verify.data.valid
                ? "Audit chain verified"
                : "Audit chain integrity issue"}
            </strong>

            <span>
              {Number(
                verify.data.checkedEvents || 0
              ).toLocaleString()}{" "}
              events checked ·{" "}
              {verify.data.firstBrokenRow
                ? `First broken row: ${verify.data.firstBrokenRow}`
                : "No broken rows detected"}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

// ==========================================
// USER MANAGEMENT PAGE
// ==========================================

export function AdminUsers() {
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.users,
  });

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");

  const users = usersQuery.data || [];

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        [user.name, user.email, user.id].some(
          (value) =>
            String(value || "")
              .toLowerCase()
              .includes(term)
        );

      return (
        matchesSearch &&
        (role === "ALL" || user.role === role)
      );
    });
  }, [users, search, role]);

  const counts = {
    STUDENT: users.filter(
      (u) => u.role === "STUDENT"
    ).length,

    PROFESSOR: users.filter(
      (u) => u.role === "PROFESSOR"
    ).length,

    ADMIN: users.filter(
      (u) => u.role === "ADMIN"
    ).length,
  };

  return (
    <>
      <PageHeading
        title="User Management"
        subtitle="View and search registered accounts across the academic support platform."
      />

      <div className="stats-grid admin-user-stats">
        <Stat
          label="All users"
          value={String(users.length).padStart(2, "0")}
          note="Registered platform accounts"
          icon={Users}
        />

        <Stat
          label="Students"
          value={String(counts.STUDENT).padStart(2, "0")}
          note="Student accounts"
          icon={GraduationCap}
        />

        <Stat
          label="Professors"
          value={String(counts.PROFESSOR).padStart(2, "0")}
          note="Teaching accounts"
          icon={BriefcaseBusiness}
        />

        <Stat
          label="Administrators"
          value={String(counts.ADMIN).padStart(2, "0")}
          note="Platform administrators"
          icon={ShieldCheck}
        />
      </div>

      <Card>
        <div className="panel-heading admin-users-heading">
          <div>
            <h2>Registered accounts</h2>
            <p>
              Search accounts and filter by platform role.
              Account details are read-only in this version.
            </p>
          </div>

          <span className="admin-result-count">
            {filteredUsers.length} of {users.length} users
          </span>
        </div>

        <div className="admin-toolbar">
          <label className="admin-search">
            <Search size={16} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search name, email or user ID"
              aria-label="Search users"
            />
          </label>

          <label className="admin-role-filter">
            <Filter size={15} />

            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value)
              }
              aria-label="Filter users by role"
            >
              <option value="ALL">All roles</option>
              <option value="STUDENT">Students</option>
              <option value="PROFESSOR">Professors</option>
              <option value="ADMIN">Administrators</option>
            </select>
          </label>

          <button
            type="button"
            className="button secondary admin-reset"
            onClick={() => {
              setSearch("");
              setRole("ALL");
            }}
          >
            <RefreshCw size={14} />
            Reset
          </button>
        </div>

        {usersQuery.isLoading ? (
          <Spinner label="Loading registered users…" />
        ) : usersQuery.isError ? (
          <Notice kind="error">
            Unable to load user accounts. Please try again later.
          </Notice>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            text="Try changing your search term or role filter."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>User ID</th>
                  <th>Role</th>
                  <th>Account status</th>
                  <th>Joined</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-avatar">
                          {user.initials ||
                            user.name
                              ?.split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("") || (
                              <UserRound size={15} />
                            )}
                        </span>

                        <span>
                          <strong>
                            {user.name || "Unnamed user"}
                          </strong>

                          <small>
                            {user.email || "No email available"}
                          </small>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="admin-id">
                        {user.id}
                      </span>
                    </td>

                    <td>
                      <Status status={user.role || "UNKNOWN"} />
                    </td>

                    <td>
                      <span
                        className={`admin-account-status ${
                          user.active === false
                            ? "inactive"
                            : "active"
                        }`}
                      >
                        <i />
                        {user.active === false
                          ? "Inactive"
                          : "Active"}
                      </span>
                    </td>

                    <td className="admin-date">
                      <CalendarDays size={13} />
                      {user.joined || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-table-note">
          Account activation and role changes are not enabled
          in this version. They should be performed through
          authenticated backend operations with audit logging.
        </div>
      </Card>
    </>
  );
}

// ==========================================
// AUDIT VERIFICATION PAGE
// ==========================================

export function AdminAudit() {
  const queryClient = useQueryClient();

  const verify = useMutation({
    mutationFn: adminApi.verifyAudit,

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin-users"],
      }),
  });

  const result = verify.data;

  return (
    <>
      <PageHeading
        title="Audit Verification"
        subtitle="Check the integrity of the platform's append-only, hash-chained audit history."
        action={
          <button
            className="button primary"
            onClick={() => verify.mutate()}
            disabled={verify.isPending}
          >
            <ShieldCheck size={15} />

            {verify.isPending
              ? "Verifying…"
              : "Run verification"}
          </button>
        }
      />

      <div className="stats-grid admin-audit-stats">
        <Stat
          label="Verification status"
          value={
            result
              ? result.valid
                ? "Valid"
                : "Issue found"
              : "Not run"
          }
          note="Latest verification result"
          icon={ShieldCheck}
          tone={result?.valid ? "green" : "amber"}
        />

        <Stat
          label="Events checked"
          value={
            result
              ? Number(
                  result.checkedEvents || 0
                ).toLocaleString()
              : "—"
          }
          note="Audit records examined"
          icon={CheckCircle2}
        />

        <Stat
          label="First broken row"
          value={
            result?.firstBrokenRow ??
            (result?.valid ? "None" : "—")
          }
          note="Reported integrity failure"
          icon={AlertTriangle}
          tone={result?.valid ? "green" : "amber"}
        />

        <Stat
          label="Verification time"
          value={
            result?.verifiedAt
              ? new Date(
                  result.verifiedAt
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
          note={
            result?.verifiedAt
              ? dateLabel(result.verifiedAt)
              : "No verification run yet"
          }
          icon={CalendarDays}
        />
      </div>

      <Card>
        <div className="panel-heading">
          <div>
            <h2>Audit chain integrity</h2>
            <p>
              Run a read-only integrity check against the
              stored audit event chain.
            </p>
          </div>

          <span className="stat-icon green">
            <ShieldCheck size={18} />
          </span>
        </div>

        <p className="muted audit-copy">
          The verification operation should recompute event
          hashes in sequence and check that each event links
          to the preceding event. It should not modify audit records.
        </p>

        <button
          className="button primary"
          onClick={() => verify.mutate()}
          disabled={verify.isPending}
        >
          <ShieldCheck size={16} />

          {verify.isPending
            ? "Verifying audit chain…"
            : "Verify audit chain"}
        </button>

        {verify.isError && (
          <div style={{ marginTop: 14 }}>
            <Notice kind="error">
              Verification could not be completed.
              Check the API connection and try again.
            </Notice>
          </div>
        )}

        {result && (
          <div
            className={`audit-result ${
              result.valid ? "valid" : "invalid"
            }`}
          >
            {result.valid ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}

            <div>
              <strong>
                {result.valid
                  ? "Audit chain verified"
                  : "Audit chain integrity issue detected"}
              </strong>

              <span>
                {Number(
                  result.checkedEvents || 0
                ).toLocaleString()}{" "}
                events checked ·{" "}
                {result.firstBrokenRow
                  ? `First broken row: ${result.firstBrokenRow}`
                  : "No broken rows detected"}
              </span>

              {result.verifiedAt && (
                <span>
                  Verified at{" "}
                  {new Date(
                    result.verifiedAt
                  ).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {!result && !verify.isPending && (
          <div className="admin-audit-placeholder">
            <ShieldCheck size={24} />

            <strong>
              Verification has not been run
            </strong>

            <span>
              Run the check to inspect the integrity
              status of the audit chain.
            </span>
          </div>
        )}
      </Card>

      <Notice kind="info">
        This page currently displays verification results
        returned by the API. A detailed event-by-event audit
        history requires a separate backend endpoint.
      </Notice>
    </>
  );
}

export default AdminDashboard;
