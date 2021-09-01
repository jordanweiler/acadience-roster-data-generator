# Acadience Roster Import test data generator

Generates test data that conforms to the Acadience roster import format.

## Usage

Clone

```
git clone git@github.com:jmeyers91/acadience-roster-data-generator.git
```

Install dependencies

```
cd acadience-roster-data-generator
npm i
```

Run the generator

```
npm run start
```

or

```
node path/to/acadience-roster-data-generator
```

After running the generator, a directory should be created in your current working directory called "roster-import-{name}={size}-TIMESTAMP" that contains the sample data CSVs.

You can updaet the values inside the `main()` function to create different sized datasets. Each dataset created will generate a random name for the district.
