import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Building2, GraduationCap, Users } from "lucide-react";
import { PageHeader, Panel } from "@/components/dash/ui";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & Project Team — DeadlockLab" },
      { name: "description", content: "Meet the DeadlockLab project team and view its academic details." },
    ],
  }),
  component: AboutPage,
});

const team = [
  { name: "Savitri Hargude", roll: "81", prn: "202401040023" },
  { name: "Sayali Mane", roll: "108", prn: "202401040172" },
  { name: "Oshin Kalbande", roll: "113", prn: "202401040189" },
  { name: "Vedant Jadhav", roll: "121", prn: "202401040231" },
  { name: "Vedanshu Shirode", roll: "125", prn: "202401040255" },
];

const academicDetails = [
  { label: "Course", value: "Operating Systems", icon: BookOpen },
  { label: "Project", value: "DeadlockLab", icon: Users },
  { label: "College", value: "MIT Academy of Engineering, Alandi", icon: Building2 },
];

const guideDetails = [
  { label: "Guide name", value: "Dr. Vijaykumar P. Mantri" },
  { label: "Designation", value: "To be confirmed" },
];

function AboutPage() {
  return (
    <>
      <PageHeader
        icon={<Users className="h-6 w-6" />}
        title="About DeadlockLab"
        subtitle="Project details and the team behind this operating-systems deadlock analysis dashboard."
      />

      <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-card md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">Project team</p>
        <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">Built together, understood deeply.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-primary-foreground/80">
          DeadlockLab demonstrates operating-system deadlock analysis through interactive, backend-powered tools.
        </p>
      </section>

      <section aria-label="Academic project details" className="mb-8 grid gap-4 md:grid-cols-3">
        {academicDetails.map(({ label, value, icon: Icon }) => (
          <Panel key={label} className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-card-foreground">{value}</p>
            </div>
          </Panel>
        ))}
      </section>

      <Panel title="Project guide" className="mb-8 border-primary/20 bg-accent/30">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-6 text-muted-foreground">
              The provided link opens a Google image result for the college logo, not a project-guide profile. Please confirm these details with your project supervisor.
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {guideDetails.map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Panel>

      <section aria-labelledby="team-heading">
        <div className="mb-4">
          <h2 id="team-heading" className="font-display text-xl font-bold text-foreground">Meet the team</h2>
          <p className="mt-1 text-sm text-muted-foreground">Five contributors to the DeadlockLab project.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {team.map((member, index) => (
            <Panel key={member.prn} className="group transition-transform hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-brand font-display text-lg font-bold text-primary-foreground shadow-glow">
                  {member.name.split(" ").map((part) => part[0]).join("")}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Team member {String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-1 break-words font-display text-base font-bold text-card-foreground">{member.name}</h3>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Roll No.</dt>
                  <dd className="mt-1 font-mono text-sm font-semibold text-foreground">{member.roll}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-muted-foreground">PRN</dt>
                  <dd className="mt-1 break-all font-mono text-xs font-semibold leading-5 text-foreground sm:text-sm">{member.prn}</dd>
                </div>
              </dl>
            </Panel>
          ))}
        </div>
      </section>
    </>
  );
}
