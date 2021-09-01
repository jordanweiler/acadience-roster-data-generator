const path = require('path');
const faker = require('faker');
const mkdirp = require('mkdirp');
const CsvBuilder = require('csv-builder');
const { createWriteStream, writeFileSync } = require('fs');

function randomNil() {
  if (faker.random.boolean()) {
    return undefined;
  }
  if (faker.random.boolean()) {
    return null;
  }
  return '';
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
    'Property Name': 'Version',
    Value: '1.0'
  };
}

// School
// ID - Required, unique, alphanumeric
// NCES ID - Optional, unique, numeric
// Name - Required, alphanumeric
function generateSchool() {
  return {
    ID: faker.random.uuid(), // Required, unique, alphanumeric
    'NCES ID': maybeNil(faker.random.number()), // Optional, unique, numeric
    Name: sample([faker.name.lastName(), faker.address.streetName()]) // Required, alphanumeric
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
    'School ID': schoolId,
    Name: faker.name.lastName(),
    Type: ''
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
function generateStudent({ teacherId }) {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();

  return {
    ID: faker.random.uuid(),
    'Primary ID': faker.random.uuid(),
    'Secondary ID': maybeNil(faker.random.uuid()),
    'Last Name': lastName,
    'First Name': firstName,
    Nickname: maybeNil(faker.name.firstName()),
    Email: '',
    DOB: faker.date.past(18).toISOString().slice(0, 10),
    'Grade Level': sample(['K', '1', '2', '3', '4', '5', '6']),
    'Teacher ID': maybeNil(teacherId)
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
function generateStaff(districtName) {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();

  return {
    ID: faker.random.uuid(),
    'Primary ID': faker.random.uuid(),
    'Secondary ID': maybeNil(faker.random.uuid()),
    'Last Name': lastName,
    'First Name': firstName,
    Nickname: maybeNil(faker.name.firstName()),
    Email: faker.internet.email(firstName, lastName, `${districtName}.k12.us`),
    'Job Title': ''
  };
}

// StudentEnrollment
// ID - Required, unique, alphanumeric
// Student ID - Required, unique, alphanumeric
// Class ID - Required, unique, alphanumeric
function generateStudentEnrollment({ studentId, classId }) {
  return {
    ID: faker.random.uuid(),
    'Student ID': studentId,
    'Class ID': classId
  };
}

// StaffEnrollment
// ID - Required, unique, alphanumeric
// Staff ID - Required, alphanumeric
// School ID - Optional, alphanumeric
// Class ID - Optional, alphanumeric
// Role - Required, alphanumeric
function generateStaffEnrollment({ staffId, schoolId, classId }) {
  if (classId) {
    return {
      ID: faker.random.uuid(),
      'Staff ID': staffId,
      'School ID': schoolId,
      'Class ID': classId,
      Role: sample(['Assessor', 'Teacher', 'Data Viewer'])
    };
  }
  return {
    ID: faker.random.uuid(),
    'Staff ID': staffId,
    'School ID': schoolId,
    'Class ID': classId,
    Role: sample(['Assessor', 'Teacher', 'Administrator', 'Data Viewer', 'Data Manager'])
  };
}

function generateImportDataset(schoolCount, classesPerSchool, studentsPerClass, staffPerClass, districtName) {
  const manifest = generateManifest();
  const schools = [];
  const classes = [];
  const staffs = [];
  const students = [];
  const staffEnrollments = [];
  const studentEnrollments = [];

  let i = 0;

  // Generate District staff
  for (i = 0; i < Math.max(schoolCount / 2, 4); i++) {
    const staff = generateStaff(districtName);

    staffs.push(staff);
    staffEnrollments.push(generateStaffEnrollment({ staffId: staff.ID }));
  }

  // Generate schools
  i = 0;
  while (i < schoolCount) {
    const school = generateSchool();

    // Only add uniquely named schools
    if (!schools.find((existingSchool) => existingSchool.Name === school.Name)) {
      schools.push(school);
      i += 1;
    }
  }

  for (const school of schools) {
    const schoolStaff = [];

    // Generate staff at the school
    i = 0;
    while (i < 5) {
      const staff = generateStaff(districtName);

      // Only add staff with unique emails
      if (!staffs.find((existingStaff) => existingStaff.Email === staff.Email)) {
        schoolStaff.push(staff);
        staffs.push(staff);
        i += 1;
      }
    }

    const schoolStaffEnrollments = schoolStaff.map((staff) =>
      generateStaffEnrollment({ staffId: staff.ID, schoolId: school.ID })
    );

    staffEnrollments.push(...schoolStaffEnrollments);
  }

  // Generate classes
  i = 0;
  while (i < schoolCount * classesPerSchool) {
    const school = sample(schools);

    const classroom = generateClass({ schoolId: school.ID });

    // Only add classes that have unique names within the school
    if (
      !classes.find(
        (existingClass) => existingClass['School ID'] === school.ID && existingClass.Name === classroom.Name
      )
    ) {
      classes.push(classroom);
      i += 1;
    }
  }

  // Generate staff, students, and enrollments for each class
  for (const classroom of classes) {
    const classroomStaffs = [];
    const classroomStudents = [];

    i = 0;
    while (i < staffPerClass) {
      const staff = generateStaff(districtName);

      // Only add staff with unique emails
      if (!staffs.find((existingStaff) => existingStaff.Email === staff.Email)) {
        classroomStaffs.push(staff);
        staffs.push(staff);
        i += 1;
      }
    }

    for (let i = 0; i < studentsPerClass; i++) {
      const teacher = sample(classroomStaffs);
      classroomStudents.push(generateStudent({ teacherId: teacher.ID }));
    }

    const classroomStaffEnrollments = classroomStaffs.map((staff) =>
      generateStaffEnrollment({
        staffId: staff.ID,
        schoolId: classroom['School ID'],
        classId: classroom.ID
      })
    );

    const classroomStudentEnrollments = classroomStudents.map((student) =>
      generateStudentEnrollment({
        studentId: student.ID,
        classId: classroom.ID
      })
    );

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
    studentEnrollments
  };
}

main();
function main() {
  const districtName = faker.name.lastName();

  // Change these values to create different sized districts
  const schoolCount = 7;
  const classesPerSchool = 12;
  const studentsPerClass = 18;
  const staffPerClass = 1;

  const numberOfStudentsInThousands = Math.floor((schoolCount * classesPerSchool * studentsPerClass) / 1000);

  const importDataset = generateImportDataset(
    schoolCount,
    classesPerSchool,
    studentsPerClass,
    staffPerClass,
    districtName
  );
  const outDir = path.resolve(`./roster-import-${districtName}-${numberOfStudentsInThousands}k-${Date.now()}`);
  const manifestCsvPath = path.join(outDir, 'manifest.csv');
  const schoolsCsvPath = path.join(outDir, 'Schools.csv');
  const classesCsvPath = path.join(outDir, 'Classes.csv');
  const staffCsvPath = path.join(outDir, 'Staff.csv');
  const studentCsvPath = path.join(outDir, 'Students.csv');
  const studentEnrollmentsCsvPath = path.join(outDir, 'StudentEnrollments.csv');
  const staffEnrollmentsCsvPath = path.join(outDir, 'StaffEnrollments.csv');

  // Create directory
  mkdirp.sync(outDir);

  // Generate CSVs
  new CsvBuilder({
    headers: Object.keys(importDataset.schools[0])
  })
    .createReadStream(importDataset.schools)
    .pipe(createWriteStream(schoolsCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.classes[0])
  })
    .createReadStream(importDataset.classes)
    .pipe(createWriteStream(classesCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.staffs[0])
  })
    .createReadStream(importDataset.staffs)
    .pipe(createWriteStream(staffCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.students[0])
  })
    .createReadStream(importDataset.students)
    .pipe(createWriteStream(studentCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.studentEnrollments[0])
  })
    .createReadStream(importDataset.studentEnrollments)
    .pipe(createWriteStream(studentEnrollmentsCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.staffEnrollments[0])
  })
    .createReadStream(importDataset.staffEnrollments)
    .pipe(createWriteStream(staffEnrollmentsCsvPath));

  new CsvBuilder({
    headers: Object.keys(importDataset.manifest)
  })
    .createReadStream([importDataset.manifest])
    .pipe(createWriteStream(manifestCsvPath));
}
