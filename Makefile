ifndef STAGE
	override STAGE = dev
endif

ifndef REGION
	override REGION = ap-south-1
endif

remove: destroy
deploy: build

build:
	cd restapp; npm run build;

install:
	cd restapp;npm install

deploy-app:
	cd restapp; npm run build;
	sls deploy --restapp --force --stage $(STAGE);

deploy:
	cd restapp; npm run build;
	sls deploy --stage $(STAGE);

local:
	cd restapp; npm run serve-nodemon;

local-server:
	cd restapp; npm run serve-forever;

destroy:
	sls remove --stage $(STAGE);

env:
	@echo "current env = $(STAGE)"

logs:
	sls logs -f restapp --stage $(STAGE);

deploy-application:
	npm install -g serverless; npm install;
	cd restapp; npm install; npm run build;
	echo "$$$$$$$$$$$$$$$$$4 BYE $$$$$$$$$$$";
	serverless deploy --restapp --force --stage $(STAGE);