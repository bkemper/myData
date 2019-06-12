const difference = (expected, actual) => (
  expected.reduce((acc, value) => {
    if (actual.includes(value)) {
      return acc;
    }

    return [...acc, value];
  }, [])
);

module.exports = difference;
