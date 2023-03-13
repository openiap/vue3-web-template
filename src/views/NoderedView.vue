<template>
  <div class="card">
    <div class="row">
      <div class="col">
        <button class="button primary" @click="Create" v-shortkey.propagte="['ctrl', 'c']"
          @shortkey="Create">Create</button>
        <button class="button error" @click="Delete" v-shortkey.propagte="['del']" @shortkey="Delete">Delete</button>
        <button class="button success" @click="Open" v-shortkey.propagte="['ctrl', 'o']" @shortkey="Open">Open
          Nodered</button>
      </div>
    </div>
    <div v-for="(instance, i) in instances" :key="i" class="card">
      <div class="row">
        <div class="col">name</div>
        <div class="col">{{instance.metadata.name}}</div>
      </div>
      <div class="row">
        <div class="col">cpu</div>
        <div class="col">{{instance.metrics?.cpu + "/" +
        instance.spec.containers[0].resources.limits.cpu}}</div>
      </div>
      <div class="row">
        <div class="col">mem</div>
        <div class="col">{{instance.metrics?.memory + "/" +
        instance.spec.containers[0].resources.limits.memory}}</div>
      </div>
      <div class="row">
        <div class="col">status</div>
        <div class="col">{{ instance.metadata.deletionTimestamp != null ? " deleting" :
        instance.status.phase }}
          <button class="button" @click="GetInstanceLog(instance)">Logs</button>
        </div>
      </div>
    </div>
    <div class="card" v-if="errormessage">
      <div class="row">
        <h1 class="text-error">{{errormessage}}</h1>
      </div>
    </div>

    <div class="card" v-if="instancelog">
      <pre>{{ instancelog }}</pre>
    </div>
    <br />

    <div v-if="Config.allow_personal_nodered == true && hasrole('personal nodered users')" class="card">
      <div class="row" v-if="Config.multi_tenant == false || hasrole('admins')">
        <label class="col"><span translate lib="web">autocreate</span>: </label>
        <div class="col">
          <input type="checkbox" v-model="nodered.autocreate" />
        </div>
      </div>
      <div class="row">
        <label class="col"><span translate lib="web">api_allow_anonymous</span>: </label>
        <div class="col">
          <input type="checkbox" v-model="nodered.api_allow_anonymous" />
        </div>
      </div>
      <div class="row">
        <label class="col"><span translate lib="web">function_external_modules</span>: </label>
        <div class="col">
          <input type="checkbox" v-model="nodered.function_external_modules" />
        </div>
      </div>
      <div class="row">
        <label class="col"><span translate lib="web">enable tour</span>: </label>
        <div class="col">
          <input type="checkbox" v-model="nodered.tours" />
        </div>
      </div>
      <div class="row">
        <label class="col"><span translate lib="web">monaco editor</span>: </label>
        <div class="col">
          <input type="checkbox" v-model="nodered.monaco" />
        </div>
      </div>
      <section>
        <div class="row" v-if="Config.nodered_images.length > 1">
          <label class="col"><span translate lib="web">nodered_image</span>: </label>
          <div class="col">
            <select>
              <option v-for="image in Config.nodered_images" :selected="image.name === nodered.nodered_image_name"
                :key="image.name">{{
                image.name }}</option>
            </select>
          </div>
        </div>

      </section>
      <section>
        <div class="row" v-if="nodered">
          {{ nodered.tz }}
          <label class="col"><span translate lib="web">timezone</span>: </label>
          <div class="col">
            <TimezoneField v-model="nodered.tz" />
          </div>
        </div>
        {{Config.multi_tenant}}
        <div v-if="hasrole('admins') && !Config.multi_tenant" class="row">
          <label class="col"><span translate lib="web">memory</span>: </label>
          <div class="col">
            <select class="form-control" v-model="limitsmemory">
              <option value="">Fair usage</option>
              <option value="256Mi">256Mi</option>
              <option value="512Mi">512Mi</option>
              <option value="1Gi">1Gi</option>
              <option value="1536Mi">1,5Gi</option>
              <option value="2Gi">2Gi</option>
              <option value="2560Mi">5,5Gi</option>
              <option value="3Gi">3Gi</option>
            </select>
          </div>
        </div>
        <div v-if="hasrole('admins') && labels && keys && keys.length > 0">
          <label class="col"><span translate lib="web">label</span>: </label>
          <div class="col5">
            <span class="border mr-2" ng-repeat="key in labelkeys" @click="removekey(key)">{{key + '=' +
            label[key]}}</span>
            <br>
            <select v-model="newkey" ng-options="item as item for item in keys" ng-change="newkeyselected()"></select>
            <select v-model="newvalue" ng-options="item as item for item in labels[newkey]"></select>
            <button type="button" class="btn" translate lib="web" @click="addkey()">add</button>
            <button type="button" class="btn" translate lib="web" @click="removekey()">remove</button>
          </div>
        </div>
      </section>
      <section v-if="Config.allow_personal_nodered == true && hasrole('personal nodered users')">
        <div>
          <div class="col">
            <button type="button primary" class="btn btn-success" translate lib="web" @click="Save()">save</button>
          </div>
        </div>
      </section>
    </div>
  </div>

</template>

<script>
import { mapGetters } from 'vuex'
import TimezoneField from '../components/TimezoneField.vue'
export default {
  name: "NoderedView",
  props: {
    propuserid: { default: "" }
  },
  data() {
    return {
      instances: [],
      instance: {},
      labels: [],
      keys: [],
      label: [],
      labelkeys: [],
      key: "",
      userid: "",
      username: "",
      errormessage: "",
      instancelog: "",
      refreshtimer: { "timer": null, "interval": 1000 },
      nodered: {},
      limitsmemory: "",
      user: {},
    };
  },
  computed: {
    ...mapGetters(["Config", "Signedin", "User", "Client"]),
  },
  methods: {
    hasrole(role) {
      var hasrole = this.User.roles.indexOf(role) > -1;
      return hasrole;
    },
    async Open() {
      let name = this.username;
      name = name.toLowerCase();
      name = name.replace(/([^a-z0-9]+){1,63}/gi, "");
      const noderedurl = "//" + this.Config.nodered_domain_schema.replace("$nodered_id$", name);
      window.open(noderedurl);
    },
    async GetInstances() {
      if (!this.Signedin)
        return;
      if (this.labels.length == 0) {
        this.labels = await this.Client.GetKubeNodeLabels({});
        if (this.labels != null)
          this.keys = Object.keys(this.labels);
      }
      if (Util.IsNullEmpty(this.userid)) {
        this.userid = this.User._id;
      }
      if (Util.IsNullEmpty(this.username)) {
        var users = await this.Client.Query({ collectionname: "users", query: { _id: this.userid }, top: 1 });;
        this.user = users[0];
        this.username = this.user.username;
        this.nodered = this.user.nodered;
        this.nodered.nodered_image_name = this.nodered.nodered_image_name || WebSocketClientService.nodered_images[0].name;

      }
      if (this.nodered != null && this.nodered.resources != null && this.nodered.resources.limits != null) {
        this.limitsmemory = this.nodered.resources.limits.memory;
      }
      this.instances = await this.Client.GetNoderedInstance({ _id: this.userid });
      if (this.instances > 0) {
        this.instance = this.instances[0];
      }
      // if (this.refreshtimer.timer == null && this.instances.length > 0) {
      //   this.refreshtimer.timer = setTimeout(() => {
      //     this.refreshtimer.timer = null;
      //     this.GetInstances();
      //   }, this.refreshtimer.interval);
      // }
    },
    async GetInstanceLog(instance) {
      try {
        if (Util.IsNullEmpty(this.instancelog)) {
          var logs = await this.Client.GetNoderedInstanceLog({ _id: this.userid, instancename: instance.metadata.name });
          this.instancelog = logs.split("\n").reverse().join("\n");
        } else {
          this.instancelog = "";
        }
      }
      catch (error) {
        this.errormessage = error;
        console.error(error);
      }
    },
    async Create() {
      await this.Client.EnsureNoderedInstance({ _id: this.userid });
      this.GetInstances();
    },
    async Delete() {
      await this.Client.DeleteNoderedInstance({ _id: this.userid });
      this.GetInstances();
    },
    async Save() {
      try {
        if (this.nodered.resources == null) {
          this.nodered.resources = {};
        }
        if (this.nodered.resources.limits == null) {
          this.nodered.resources.limits = {};
        }
        this.nodered.resources.limits.memory = this.limitsmemory;
        this.nodered.labels = this.label;
        this.nodered.nodered_image_name = this.nodered.nodered_image_name || WebSocketClientService.nodered_images[0].name;
        this.user.nodered = this.nodered;
        var u = JSON.parse(JSON.stringify(this.user));
        var u = await this.Client.UpdateOne({ collectionname: "users", item: u });
        this.GetInstances();
      } catch (error) {
        this.errormessage = error;
      }
    },      
  },
  watch: {
    Signedin: function (val, oldVal) {
      this.GetInstances();
    },
  },
  unmounted() {
    if (this.refreshtimer.timer != null) {
      clearTimeout(this.refreshtimer.timer);
      this.refreshtimer.timer = null;
    }
  },
  created() {
    this.userid = this.propuserid;
    this.GetInstances();
  },
  mounted() {
  },
  components: { TimezoneField }
}
</script>
