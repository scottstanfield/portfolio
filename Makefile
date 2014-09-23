release:
	gulp

debug:
	gulp debug

clean:
	gulp clean

monitor:
	nodemon -w gulpfile.js debug

.PHONY: release
