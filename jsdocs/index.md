##Vanadium JavaScript API
Vanadium JavaScript provides JavaScript APIs into the Vanadium application environment that work in NodeJS and Chrome browser and enable development of Vanadium-based applications in JavaScript.

For more details about the Vanadium project, please visit [https://v.io](https://v.io).

##[Vanadium Module](./module-vanadium.html)
[Vanadium module](./module-vanadium.html) is the entry point to the public Vanadium API.

[Runtime](./module-vanadium-Runtime.html), as returned by the
[init](module-vanadium.html#.init) function, defines entry points to create servers, client, blessing and other Vanadium functionality.
```
var vanadium = require('vanadium'); // Import Vanadium module
vanadium.init(function(err, runtime) { // Initialize Vanadium
  if(err) {
    // Handle initialization errors
  }

  // Use runtime
});
```
##Tutorials
Please visit tutorials section of [v.io website](https://www.v.io/tutorials/javascript/overview.html) for JavaScript tutorials.