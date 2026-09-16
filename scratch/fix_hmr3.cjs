const fs = require("fs");
let main = fs.readFileSync("src/main.js", "utf8");

main = main.replace(
  `    }
  });
}

// Routes Mapping`,
  `    }
  });
  }
}

// Routes Mapping`
);

fs.writeFileSync("src/main.js", main);
console.log("Fixed bracket 3");
