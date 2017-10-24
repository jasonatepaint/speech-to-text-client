##To setup Dev

- Setup the client code
	- `yarn`
- Setup hard links so you can easily debug/edit on the fly
	- `sh dev_setup.sh`
- Setup demo client (for testing)
	- `cd demo && yarn`
	- `yarn start`
	
## To build/make ready for use from NPM installs

- Run the build script
	- `yarn build`
- Check in files from the ./dist folder


## Note:
The 'worker.js' file (at root), has been embedded into ./src/recorder.js. This is because the HTML5 Worker class needs 
to be loaded from a URL. We use a Blob/BlobUrl to create at runtime w/o having to host the worker.js file

If code in the worker needs to be updated. Update the class and copy/paste into ./src/recorder.js