# VZM and vcf to HTML

This is a script I wrote to convert Verizon message exports (circa 2017) and an associated vCard file to useful HTML

This is just a script and is not written all that well but it was useful for me and I found nothing when I was looking for any tooling so here you go.

npm install

create a file named config.js that looks like this

```
module.exports = {
  myPhone : '+13334445555',
  myName : "Bob"
}
```

Put your *.vzm and *-parts folders in the VZMessages folder and a vcf name Contacts.vcf next to the script and the script will spit out html in the output folder.

I'm not looking to support this but feel free to use it as a base for your own work. I'd love to see what you do so ping me if you do anything with it.