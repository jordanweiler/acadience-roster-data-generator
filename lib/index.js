const path = require("path");
const faker = require("faker");
const mkdirp = require("mkdirp");
const CsvBuilder = require("csv-builder");
const { createWriteStream, writeFileSync } = require("fs");

function randomNil() {
  if (faker.random.boolean()) {
    return undefined;
  }
  if (faker.random.boolean()) {
    return null;
  }
  return "";
}

/**
 * Randomly replaces a value with `null`, `undefined`, or `""`.
 */
function maybeNil(value) {
  if (faker.random.boolean()) {
    return value;
  }
  return randomNil();
}

/**
 * Picks a random value in `array` and returns it.
 */
function sample(array) {
  return faker.helpers.shuffle([...array])[0];
}

function generateManifest() {
  return {
    version: "1.0",
  };
}

// School
// ID - Required, unique, alphanumeric
// NCES ID - Optional, unique, numeric
// Name - Required, alphanumeric
function generateSchool() {
  return {
    ID: faker.random.uuid(), // Required, unique, alphanumeric
    "NCES ID": maybeNil(faker.random.number()), // Optional, unique, numeric
    Name: faker.company.companyName(), // Required, alphanumeric
  };
}

// Class
// ID - Required, unique, alphanumeric
// School ID - Required, alphanumeric
// Name - Required, alphanumeric
// Type - Optional, alphanumeric (default: class)
function generateClass({ schoolId }) {
  return {
    ID: faker.random.uuid(),
    "School ID": schoolId,
    Name: faker.company.companyName(),
    Type: maybeNil(sample(["class", "group"])),
  };
}

// Student
// ID - Required, unique, alphanumeric
// Primary ID - Required, unique, alphanumeric
// Secondary ID - Optional, unique, alphanumeric
// Last Name - Required, alphanumeric
// First Name - Required, alphanumeric
// Nickname - Optional, alphanumeric
// Email - Optional, unique, valid email
// DOB - Required, date
// Grade Level - Required, alphanumeric
// Teacher ID - Optional, alphanumeric
// Demographic1 - Optional, alphanumeric
// Demographic2 - Optional, alphanumeric
// Demographic3 - Optional, alphanumeric
function generateStudent({ teacherId }) {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();

  return {
    ID: faker.random.uuid(),
    "Primary ID": faker.random.uuid(),
    "Secondary ID": maybeNil(faker.random.uuid()),
    "Last Name": lastName,
    "First Name": firstName,
    Nickname: maybeNil(faker.internet.userName()),
    Email: maybeNil(faker.internet.email(firstName, lastName)),
    DOB: faker.date.past(18).toISOString().slice(0, 10),
    "Grade Level": sample(["K", "k", "1", "2", "3", "4", "5", "6"]),
    "Teacher ID": maybeNil(teacherId),
    Demographic1: maybeNil(faker.lorem.word()),
    Demographic2: maybeNil(faker.lorem.word()),
    Demographic3: maybeNil(faker.lorem.word()),
  };
}

// Staff
// ID - Required, unique, alphanumeric
// Primary ID - Required, unique, alphanumeric
// Secondary ID - Optional, unique, alphanumeric
// Last Name - Required, alphanumeric
// First Name - Required, alphanumeric
// Nickname - Optional, alphanumeric
// Email - Required, unique, valid email
// Job Title - Optional, alphanumeric
function generateStaff() {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();

  return {
    ID: faker.random.uuid(),
    "Primary ID": faker.random.uuid(),
    "Secondary ID": maybeNil(faker.random.uuid()),
    "Last Name": lastName,
    "First Name": firstName,
    Nickname: maybeNil(faker.internet.userName()),
    Email: maybeNil(faker.internet.email(firstName, lastName)),
    "Job Title": faker.name.jobTitle(),
  };
}

// StudentEnrollment
// ID - Required, unique, alphanumeric
// Student ID - Required, unique, alphanumeric
// Class ID - Required, unique, alphanumeric
function generateStudentEnrollment({ studentId, classId }) {
  return {
    ID: faker.random.uuid(),
    "Student ID": studentId,
    "Class ID": classId,
  };
}

// StaffEnrollment
// ID - Required, unique, alphanumeric
// Staff ID - Required, alphanumeric
// School ID - Optional, alphanumeric
// Class ID - Optional, alphanumeric
// Role - Required, alphanumeric
function generateStaffEnrollment({ staffId, schoolId, classId }) {
  return {
    ID: faker.random.uuid(),
    "Staff ID": staffId,
    "School ID": schoolId,
    "Class ID": classId,
    Role: sample([
      "Assessor",
      "Teacher",
      "Administrator",
      "Data Viewer",
      "Data Manager",
    ]),
  };
}

function generateImportDataset({
  schoolCount = 10,
  classesPerSchool = 30,
  studentsPerClass = 25,
  staffPerClass = 1,
} = {}) {
  const manifest = generateManifest();
  const schools = [];
  const classes = [];
  const staffs = [];
  const students = [];
  const staffEnrollments = [];
  const studentEnrollments = [];

  // Generate schools
  for (let i = 0; i < schoolCount; i++) {
    schools.push(generateSchool());
  }

  // Generate classes
  for (let i = 0; i < classesPerSchool; i++) {
    const school = sample(schools);
    classes.push(generateClass({ schoolId: school.ID }));
  }

  // Generate staff, students, and enrollments for each class
  for (const classroom of classes) {
    const classroomStaffs = [];
    const classroomStudents = [];

    for (let i = 0; i < staffPerClass; i++) {
      classroomStaffs.push(generateStaff());
    }

    for (let i = 0; i < studentsPerClass; i++) {
      const teacher = sample(classroomStaffs);
      classroomStudents.push(generateStudent({ teacherId: teacher.ID }));
    }

    const classroomStaffEnrollments = classroomStaffs.map((staff) =>
      generateStaffEnrollment({
        staffId: staff.ID,
        schoolId: classroom["School ID"],
        classId: classroom.ID,
      })
    );

    const classroomStudentEnrollments = classroomStudents.map((student) =>
      generateStudentEnrollment({
        studentId: student.ID,
        classId: classroom.ID,
      })
    );

    staffs.push(...classroomStaffs);
    students.push(...classroomStudents);
    staffEnrollments.push(...classroomStaffEnrollments);
    studentEnrollments.push(...classroomStudentEnrollments);
  }

  return {
    manifest,
    schools,
    classes,
    staffs,
    students,
    staffEnrollments,
    studentEnrollments,
  };
}

main();
function main() {
  const importDataset = generateImportDataset();
  const outDir = path.resolve(`./roster-import-sample-${Date.now()}`);
  const manifestCsvPath = path.join(outDir, "manifest.csv");
  const schoolsCsvPath = path.join(outDir, "Schools.csv");
  const classesCsvPath = path.join(outDir, "Classes.csv");
  const staffCsvPath = path.join(outDir, "Staff.csv");
  const studentCsvPath = path.join(outDir, "Students.csv");
  const studentEnrollmentsCsvPath = path.join(outDir, "StudentEnrollments.csv");
  const staffEnrollmentsCsvPath = path.join(outDir, "StaffEnrollments.csv");

  // Create directory
  mkdirp.sync(outDir);

  // Generate CSVs
  new CsvBuilder({
    headers: Object.keys(importDataset.schools[0]),
  })
    .createReadStream(importDataset.schools)
    .pipe(createWriteStream(schoolsCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.classes[0]),
  })
    .createReadStream(importDataset.classes)
    .pipe(createWriteStream(classesCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.staffs[0]),
  })
    .createReadStream(importDataset.staffs)
    .pipe(createWriteStream(staffCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.students[0]),
  })
    .createReadStream(importDataset.students)
    .pipe(createWriteStream(studentCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.studentEnrollments[0]),
  })
    .createReadStream(importDataset.studentEnrollments)
    .pipe(createWriteStream(studentEnrollmentsCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.staffEnrollments[0]),
  })
    .createReadStream(importDataset.staffEnrollments)
    .pipe(createWriteStream(staffEnrollmentsCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.manifest),
  })
    .createReadStream([importDataset.manifest])
    .pipe(createWriteStream(manifestCsvPath));
}
