<template>
  <div class="home">
    <h1>Tasks page</h1>
  </div>
  <div>
    <label>Start new task</label>
    <TypeAheadQuery v-model="workflow" :collectionname="'workflow'"
      :basequery="basequery"
            @selectItem="selectItemEventHandler" ></TypeAheadQuery>
  </div>
  <ul>
    <li v-for="item in items">
      <router-link
        :to="{ name: 'FormView', params: { workflow: item.workflow, id: item._id } }">{{ item.name }}</router-link>
    </li>
  </ul>
</template>

<script>
import { mapGetters } from 'vuex';
import TypeAheadQuery from '@/components/TypeAheadQuery.vue';
export default {
  name: 'TasksView',
  data() {
    return {
      items: [],
      workflow: null,
      basequery: {"web":true}
    }
  },
  components: { TypeAheadQuery },
  computed: {
    ...mapGetters(['User', 'Signedin', 'Client']),
  },
  async created() {
    console.log("created")
    this.GetData()
  },
  methods: {
    async selectItemEventHandler(item) {
      console.log(JSON.parse( JSON.stringify(item)) )
      if(item.queue == null || item.queue == "") {
        console.log("no queue defined for this workflow")
        return
      }
      console.log("Send empty message to " + item.queue)
      var data = await this.Client.QueueMessage({ "queuename": item.queue, data: {}, striptoken: false }, true);
      console.log(JSON.parse( JSON.stringify(data)))
      var instanceid = "";
      if(data != null && data.payload != null) {
        if(data.payload._id != null && data.payload._id != "") {
          instanceid = data.payload._id
        }
      }
      if((instanceid == "" || instanceid == null) && payload._id != null && payload._id != "") {
        instanceid = payload._id;
      }
      if(instanceid != "" && instanceid != null) {
        this.$router.push({ name: 'FormView', params: { workflow: item._id, id: instanceid } })
      } else {
        console.log("error: " + JSON.parse( JSON.stringify(data)) )
      }
    },
    async GetData() {
      if (!this.Signedin) return;
      const ors = [];
      ors.push({ targetid: this.User._id });
      this.User.roles.forEach(role => {
          ors.push({ targetid: role._id });
      });
      var query = { $or: ors };
      if (!this.showcompleted) {
        query["$and"] = [{ state: { $ne: "completed" } }, { state: { $ne: "failed" } }];
        query.form = { $exists: true };
      }
      this.items = (await this.Client.Query({
        query , collectionname: "workflow_instances"
      }));
    }
  },
  watch: {
    Signedin: function (val, oldVal) {
      console.log("Signedin changed")
      if (val == true && oldVal != val) {
        this.GetData();
      }
    },
  }

}
</script>
