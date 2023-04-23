<template>
  <div class="home">
    <h1>{{ name }}</h1>
  </div>
  <div v-if="errormessage" class="row">
    <div class="col">
      <div class="card">
        <h1 class="text-error">{{ errormessage }}</h1>
      </div>
    </div>
  </div>

  <div id="formio"></div>
</template>


<script >
var _formio = null;
// declare const Formio: any;
// lang="ts"

// import { defineComponent } from 'vue';
import { mapGetters } from 'vuex';
import { Base } from "./../Base"
// import { Form, FormBuilder } from 'vue-formio';

// export default defineComponent({
export default {
  name: 'FormView',
  // components: { formio: Form, FormBuilder },
  // components: { formio: Form },
  props: {
    workflow: { default: '' },
    id: { default: '' }
  },
  data() {
    return {
      name: "Form",
      model: new Base(),
      errormessage: null,
      schema: {}
    }
  },
  computed: {
    ...mapGetters(['User', 'Signedin', 'Client']),
  },
  methods: {
    log(message) {
      console.log(message);
    },
    async GetData() {
      if (!this.Signedin) return;
      console.log("loading workflow_instances " + this.id)
      var items = await this.Client.Query({ query: { "_id": this.id }, collectionname: "workflow_instances" })
      if (items == null || items.length == 0) return;
      this.model = items[0];
      this.name = this.model.name;
      var form = this.model.form;
      if (form == null || form == "") form = this.model.payload.form
      if (form == null || form == "") {
        if(this.model.state != "idle" && this.model.state != "processing"){
          this.$router.push({ name: 'task' })
          return;
        } else if (this.model.state != "idle") {
          this.errormessage = "No form defined for this workflow instance";
        } else {
          setTimeout(() => {
            console.log("No form, pending response . . . reload in 1 second")
            this.GetData();
          }, 1000);
        }
      } else if (this.model.state == "processing") {
        setTimeout(() => {
            console.log("pending response . . . reload in 1 second")
            this.GetData();
          }, 1000);
      }
      console.log("model", JSON.parse(JSON.stringify(this.model)));
      console.log("loading form " + form)
      const res = await this.Client.Query({
        collectionname: "forms", query: { _id: form },
        orderby: { _created: -1 }, top: 1
      });
      if (res != null && res.length > 0) {
        this.form = res[0];
        this.loadForm();
      } else {
        this.errormessage = "Form " + form + " not found!"
        console.log("Form not found!")
      }
    },
    disableform(form, components) {
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        component._disabled = true;
        if (component.type == "button") {
          form.removeComponent(component, components);
        }
        if (component.type == "table") {
          for (let x = 0; x < component.rows.length; x++) {
            for (let y = 0; y < component.rows[x].length; y++) {
              const subcomponents = component.rows[x][y].components;
              this.disableform(subcomponents);
            }

          }
        }
      }
    },
    traversecomponentsPostProcess(components, data) {
      for (let i = 0; i < components.length; i++) {
        const item = components[i];
        if (item.type == "button") {
          if (data[item.key] == true) {
            return item.key;
          }
        }
      }

      for (let i = 0; i < components.length; i++) {
        const item = components[i];
        if (item.type == "table") { // old
          for (let x = 0; x < item.rows.length; x++) {
            for (let y = 0; y < item.rows[x].length; y++) {
              const subcomponents = item.rows[x][y].components;
              var result = this.traversecomponentsPostProcess(subcomponents, data);
              if (result != null) return result;
            }
          }
        } else if (item.type == "components") { // new
          const subcomponents = item.components;
          var result = this.traversecomponentsPostProcess(subcomponents, data);
          if (result != null) return result;
        }

      }
    },
    loadForm() {
      try {
        var me = this;
        if (_formio == null) {
          _formio = Formio
        } else {
          Formio = _formio;
        }
        var u = new URL(this.Client.url);
        let protocol = "http:";
        if (u.protocol == "https:" || u.protocol == "wss:") protocol = "https:";
        Formio.setBaseUrl(protocol + '//' + u.hostname);
        Formio.setProjectUrl(protocol + '//' + u.hostname);
        Formio.icons = 'fontawesome';
        Formio.createForm(document.getElementById('formio'), {
          components: this.form.formData.components
        }).then(function (form) {
          var keys = Object.keys(me.model.payload);
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const val = me.model.payload[key];
            var comp = form.getComponent(key);
            if (comp != null) {
              // console.log("component found: " + key + " = " + val)
              comp.setValue(val);
            } else {
              // console.log("component not found: " + key);
            }
          }
          const onSubmit = async function (submission) {
            const userData = submission.data;
            if (this.model.payload === null || this.model.payload === undefined) { this.model.payload = {}; }
            form.off('change', _onChange);
            form.off('submit', _onSubmit);
            var keys = Object.keys(userData);
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              this.model.payload[key] = "";
              const val = userData[key];
              this.model.payload[key] = val;
            }
            var submitbutton = this.traversecomponentsPostProcess(form.components, userData);
            this.model.payload.submitbutton = submitbutton;
            me.disableform(form, form.components);
            form.refresh()
            this.model.payload._id = this.model._id;

            // form.emit('resetForm');
              // check this https://github.com/formio/angular/issues/241
              // FormioUtils.eachComponent(Formio.Components.components.textfield.editForm().components, (component) => {
              //     console.log(`${component.key} - ${component.tooltip}`);
              // });
              var payload = await this.Client.QueueMessage({ "queuename": this.model.queue, data: this.model.payload, striptoken: false }, true);
            if (payload == null || payload.command == "timeout") {
              this.errormessage = "Failed procesing form, is the agent running? (" + this.model.queue + ")";
            }
            this.GetData();
          };
          const onChange = async function (submission, changed, e3) {
            if(!changed || !changed.changed || !changed.changed.component || !changed.changed.component.label) return;
            // console.log(changed.changed.component.label, changed);
            var submitComponents = ["Checkbox", "Select Boxes", "Radio", "Select"];
            if(submitComponents.indexOf(changed.changed.component.label) == -1) {
              return;
            }
            _onSubmit(submission)
          }
          const _onSubmit = onSubmit.bind(me);
          const _onChange = onChange.bind(me);
          form.on('submit', _onSubmit);
          setTimeout(() => {
            form.on('change', _onChange);
          }, 500);
          console.log(me.model.state, me.model)
          
          if(me.model.state !="idle") {
            me.disableform(form, form.components);
            form.refresh();
          }

        });
      } catch (error) {
        console.error(error)
        setTimeout(() => {
          this.loadForm();
        }, 500);
      }
    }
  },
  watch: {
    Signedin: async function (val, oldVal) {
      if (val == true && oldVal != val) {
        this.GetData();
      }
    },
  },
  async created() {
    this.GetData();
  },
  mounted() {
    // let scripturls = ['https://cdn.form.io/formiojs/formio.full.min.js']
    let scripturls = ['/libs/formio.full.js']
    for (let i = 0; i < scripturls.length; i++) {
      let script = document.createElement('script')
      let tag = document.head.querySelector(`[src="${script}"`);
      if (tag) {
        continue;
      }
      script.setAttribute('src', scripturls[i])
      document.head.appendChild(script)
    }
    let cssurls = ['/libs/font-awesome.4.7.0.css',
      '/libs/formio.full.css']
    // let cssurls = ['https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css',
    // 'https://cdn.form.io/formiojs/formio.full.min.css']
    // 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css', 
    for (let i = 0; i < cssurls.length; i++) {
      let tag = document.head.querySelector(`[href="${cssurls[i]}"`);
      if (tag) {
        continue;
      }
      let link = document.createElement('link')
      link.setAttribute('rel', 'stylesheet')
      link.setAttribute('href', cssurls[i])
      document.head.appendChild(link)
    }
  },
};
</script>
