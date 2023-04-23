<template>
  <div class="row">
    <div class="col">
      <button type="button" class="button primary col-3" v-on:click="Save">Save
      </button>
      <button @click="Insert" class="button hidden" v-shortkey.propagte="['insert']" @shortkey="Insert">Insert
        key</button>
      <button @click="SwapMode('json')" class="button">json</button>
      <button @click="SwapMode('form')" class="button">form</button>
      <ACL v-model="item"></ACL>
    </div>
  </div>
  <section v-if="mode=='form'">
    <div class="row">
      <div class="col">
        <h1>{{item.name}}</h1>
      </div>
    </div>
    <div v-if="errormessage" class="row">
      <div class="col">
        <div class="card">
          <h1 class="text-error">{{errormessage}}</h1>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <img src="./images/delete.png" class="operation-icon disabled" />
        name
      </div>
      <div class="col">
        <editableTextField v-model="item.name" />
      </div>
    </div>
    <div class="row">
      <div class="col">

        <div v-for="(service, i) in item.payload" :key="i">
          <div v-if="!i.startsWith('_') && i != 'name'" class="row">
            <editableTextField v-if="editingname == i" class="col" v-model="newname" @escaped="CancelEditname"
              @accepted="AcceptEditname" :emitevents="emitevents" Editing=true>
            </editableTextField>
            <div v-if="editingname != i && i != '_type' && i != 'name'" class="col"><img src="./images/delete.png"
                class="operation-icon" @click="delete item.payload[i]" /><span @click="EditName(i)">{{i}}</span></div>
            <div v-if="editingname != i && (i == '_type' || i == 'name')" class="col">{{i}}</div>
            <div class="col">
              <editableTextField v-model="item.payload[i]"></editableTextField>
            </div>

          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <small>click field to edit, press insert to add field, press esc to cancel</small>
      </div>
    </div>
  </section>
  <!-- <textarea-autosize v-if="mode=='json'" ref="myTextarea" v-model="json" :min-height="30" :max-height="350" /> -->
  <!-- <ResizeByMixin v-if="mode=='json'" v-model="json"></ResizeByMixin> -->
  <!-- <editableTextField Editing="true" v-model="json" v-if="mode=='json'"></editableTextField> -->
  <textarea v-if="mode=='json'" ref="myTextarea" v-model="json" rows="20" :min-height="30" :max-height="350" />
  <div class="row">
    <div class="col">
      <button type="button" class="button primary col-3" v-on:click="Save">Save
      </button>
      <button @click="Insert" class="button hidden" v-shortkey.propagte="['insert']" @shortkey="Insert">Insert
        key</button>
      <button @click="SwapMode('json')" class="button">json</button>
      <button @click="SwapMode('form')" class="button">form</button>
      <button @click="SwapMode('acl')" class="button">acl</button>
    </div>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import editableTextField from '@/components/editableTextField.vue';
import ResizeByMixin from '@/components/ResizeByMixin.vue';
import TypeAheadQuery from '@/components/TypeAheadQuery.vue';
import ACL from '@/components/ACL.vue';
import { Base } from "./../Base"
import { Util } from '../Util'
import { Workitem } from '@openiap/jsapi'


export default {
  name: 'WorkitemView',
  emits: ['update:item'],
  components: {
    editableTextField,
    ResizeByMixin,
    TypeAheadQuery,
    ACL
  },
  data() {
    return {
      json: "",
      item: Workitem.create({}),
      errormessage: '',
      editingname: '',
      emitevents: false,
      collectionname: 'workitems',
      newname: 'newname',
      mode: 'form',
      user: new Base()
    }
  },
  props: ['wiqid', 'id'],
  computed: {
    ...mapGetters(['Signedin', "Client"]),
  },
  created() {
    this.GetData()
  },
  watch: {
    Signedin: function (val, oldVal) {
      if (val == true && oldVal != val) {
        this.GetData();
      }
    },
    id: function (val, oldVal) {
      if (!Util.IsNullEmpty(val) == true && oldVal != val) {
        this.GetData();
      }
    },
  },
  methods: {
    SwapMode(newmode) {
      this.mode = newmode;
      if (this.mode == 'json') {
        this.json = JSON.stringify(this.item.payload, null, 2);
      } else {
        this.item.payload = JSON.parse(this.json)
      }
    },
    EditName(i) {
      this.editingname = i;
      this.newname = i;
      setTimeout(() => { this.emitevents = true }, 200)
    },
    CancelEditname() {
      this.emitevents = false;
      this.editingname = '';
      this.newname = "newname"
    },
    AcceptEditname() {
      this.emitevents = false;
      if (this.newname != this.editingname) {
        this.item[this.newname] = this.item[this.editingname];
        delete this.item[this.editingname];
      }
      this.editingname = '';
      this.newname = "newname"
    },
    Insert() {
      var payload = this.item['payload'];
      if(payload == null) payload = {};
      payload['newfield'] = '';
      this.item['payload'] = payload;
    },
    async GetData() {
      try {
        if (this.Signedin == true && !Util.IsNullEmpty(this.id)) {
          var results = await this.Client.Query({ collectionname: this.collectionname, query: { _id: this.id }, top: 1 });
          if (results.length > 0) {
            this.item = results[0];
            this.json = JSON.stringify(this.item.payload, null, 2);
          }
        } else {
          this.item.name = "new workitem";
          this.item._type = "workitem";
          this.item.wiqid = this.wiqid
          this.item.state = "new";
          this.item.payload = {};
        }
      } catch (error) {
        console.error(error);
        this.errormessage = error;
      }
    },
    async Save() {
      var item = { ...this.item };
      console.log("save",item)
      if (this.mode == "json") { item.payload = JSON.parse(this.json); }
      try {
        if (!Util.IsNullEmpty(this.id)) {
          item = await this.Client.UpdateOne({ collectionname: this.collectionname, item });
        } else {
          item = await this.Client.InsertOne({ collectionname: this.collectionname, item });
        }
        if (Util.IsNullEmpty(this.wiqid)) {
          this.$router.push({ name: 'WorkItemsViewwiqid', params: { propwiqid: item.wiqid } });
        } else {
          this.$router.push({ name: 'WorkItemsViewwiqid', params: { propwiqid: this.wiqid } });
        }
      } catch (error) {
        this.errormessage = error
      }
    }
  }
}
</script>

<style scoped>
.operation-icon {
  margin-bottom: -5px;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.operation-icon.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

body.dark .operation-icon {
  filter: invert(100%);
}

.row {
  display: flex;
}

.col {
  flex: 1;
  border: 1px #ccc;
  align-self: flex-end;
}
</style>
